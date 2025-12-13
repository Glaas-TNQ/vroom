import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: "IMPORTANT: All output text (name, descriptions, prompts, responsibilities, etc.) MUST be in English.",
  it: "IMPORTANTE: Tutto il testo prodotto (nome, descrizioni, prompt, responsabilità, ecc.) DEVE essere in italiano.",
};

interface ProviderProfile {
  id: string;
  provider_type: string;
  api_key: string;
  endpoint: string | null;
  model: string | null;
}

async function callProviderAPI(provider: ProviderProfile, messages: any[]): Promise<any> {
  const { provider_type, api_key, endpoint, model } = provider;
  
  let url: string;
  let headers: Record<string, string>;
  let body: Record<string, unknown>;

  switch (provider_type) {
    case 'openai':
      url = endpoint || 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      };
      body = {
        model: model || 'gpt-4o-mini',
        messages,
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_agent_specification',
              description: 'Create a complete agent specification with all required fields',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'The name of the agent' },
                  short_description: { type: 'string', description: 'A 2-3 sentence summary of the agent competencies and expertise for quick reference. Max 200 characters.' },
                  codename: { type: 'string', description: 'Machine-friendly identifier (snake_case)' },
                  mandate: { type: 'string', description: 'One-sentence mandate/purpose' },
                  primary_domain: { type: 'string', description: 'The primary domain of expertise' },
                  secondary_domains: { type: 'array', items: { type: 'string' }, description: 'Secondary domains if any' },
                  exclusions: { type: 'array', items: { type: 'string' }, description: 'What this agent explicitly does NOT do' },
                  reasoning_mode: { type: 'string', description: 'e.g. analytical, procedural, adversarial, generative' },
                  depth_level: { type: 'string', description: 'e.g. IC-level, Staff-level, Principal-level' },
                  decision_bias: { type: 'string', description: 'e.g. risk-averse, exploratory, conservative' },
                  core_responsibilities: { type: 'array', items: { type: 'string' }, description: 'List of core responsibilities' },
                  non_responsibilities: { type: 'array', items: { type: 'string' }, description: 'List of things this agent does NOT do' },
                  system_prompt: { type: 'string', description: 'Complete production-ready system prompt' },
                  suggested_temperature: { type: 'number', description: 'Suggested temperature setting (0-1)' },
                  suggested_icon: { type: 'string', enum: ['briefcase', 'scale', 'target', 'brain', 'chart', 'bot', 'lightbulb', 'presentation', 'heart-handshake', 'shield', 'zap', 'search', 'users', 'code', 'database'], description: 'Suggested icon based on agent type' }
                },
                required: ['name', 'short_description', 'codename', 'mandate', 'primary_domain', 'core_responsibilities', 'system_prompt', 'suggested_temperature', 'suggested_icon'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_agent_specification' } }
      };
      break;

    case 'anthropic':
      url = endpoint || 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': api_key,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      };
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const restMessages = messages.filter(m => m.role !== 'system');
      body = {
        model: model || 'claude-sonnet-4-20250514',
        system: systemMessage,
        messages: restMessages,
        max_tokens: 4096,
        tools: [
          {
            name: 'create_agent_specification',
            description: 'Create a complete agent specification with all required fields',
            input_schema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'The name of the agent' },
                short_description: { type: 'string', description: 'A 2-3 sentence summary of the agent competencies and expertise for quick reference. Max 200 characters.' },
                codename: { type: 'string', description: 'Machine-friendly identifier (snake_case)' },
                mandate: { type: 'string', description: 'One-sentence mandate/purpose' },
                primary_domain: { type: 'string', description: 'The primary domain of expertise' },
                secondary_domains: { type: 'array', items: { type: 'string' }, description: 'Secondary domains if any' },
                exclusions: { type: 'array', items: { type: 'string' }, description: 'What this agent explicitly does NOT do' },
                reasoning_mode: { type: 'string', description: 'e.g. analytical, procedural, adversarial, generative' },
                depth_level: { type: 'string', description: 'e.g. IC-level, Staff-level, Principal-level' },
                decision_bias: { type: 'string', description: 'e.g. risk-averse, exploratory, conservative' },
                core_responsibilities: { type: 'array', items: { type: 'string' }, description: 'List of core responsibilities' },
                non_responsibilities: { type: 'array', items: { type: 'string' }, description: 'List of things this agent does NOT do' },
                system_prompt: { type: 'string', description: 'Complete production-ready system prompt' },
                suggested_temperature: { type: 'number', description: 'Suggested temperature setting (0-1)' },
                suggested_icon: { type: 'string', enum: ['briefcase', 'scale', 'target', 'brain', 'chart', 'bot', 'lightbulb', 'presentation', 'heart-handshake', 'shield', 'zap', 'search', 'users', 'code', 'database'], description: 'Suggested icon based on agent type' }
              },
              required: ['name', 'short_description', 'codename', 'mandate', 'primary_domain', 'core_responsibilities', 'system_prompt', 'suggested_temperature', 'suggested_icon']
            }
          }
        ],
        tool_choice: { type: 'tool', name: 'create_agent_specification' }
      };
      break;

    default:
      // Default to OpenAI-compatible format for custom/perplexity providers
      url = endpoint || 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      };
      body = {
        model: model || 'gpt-4o-mini',
        messages,
      };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`${provider_type} API error:`, response.status, text);
    throw new Error(`${provider_type} API error: ${response.status}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, atlasPrompt, locale = 'en', providerId } = await req.json();

    if (!description) {
      throw new Error('Description is required');
    }

    if (!providerId) {
      return new Response(JSON.stringify({ 
        error: 'No API provider configured. Please configure a provider in Settings first.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Designing agent with Atlas for description:', description.substring(0, 100), 'locale:', locale);

    // Get provider profile
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: provider, error: providerError } = await supabase
      .from('provider_profiles_decrypted')
      .select('*')
      .eq('id', providerId)
      .single();

    if (providerError || !provider) {
      return new Response(JSON.stringify({ 
        error: 'Provider not found. Please configure a valid API provider in Settings.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const languageInstruction = LANGUAGE_INSTRUCTIONS[locale] || LANGUAGE_INSTRUCTIONS.en;

    const messages = [
      { role: 'system', content: `${atlasPrompt}\n\n${languageInstruction}` },
      { 
        role: 'user', 
        content: `Design an agent for the following requirement:\n\n${description}\n\nProvide the complete agent specification following your framework. Focus especially on generating a complete, production-ready system prompt that I can use directly.`
      }
    ];

    const data = await callProviderAPI(provider as ProviderProfile, messages);
    console.log('AI response received');

    // Handle different response formats
    let agentSpec;
    if (provider.provider_type === 'anthropic') {
      const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
      if (!toolUse || toolUse.name !== 'create_agent_specification') {
        throw new Error('Unexpected response format from AI');
      }
      agentSpec = toolUse.input;
    } else {
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall || toolCall.function.name !== 'create_agent_specification') {
        // If no tool call, try to parse from content
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          try {
            agentSpec = JSON.parse(content);
          } catch {
            throw new Error('Unexpected response format from AI');
          }
        } else {
          throw new Error('Unexpected response format from AI');
        }
      } else {
        agentSpec = JSON.parse(toolCall.function.arguments);
      }
    }
    
    console.log('Agent specification parsed:', agentSpec.name);

    return new Response(JSON.stringify({ agent: agentSpec }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in design-agent function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
