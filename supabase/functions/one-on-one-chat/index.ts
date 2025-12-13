import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { agentId, message, history } = await req.json();

    if (!agentId || !message) {
      return new Response(JSON.stringify({ error: 'Missing agentId or message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*, provider_profiles(*)')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error('Agent fetch error:', agentError);
      return new Response(JSON.stringify({ error: 'Agent not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build messages array with conversation history
    const messages: ChatMessage[] = [
      { role: 'user', content: agent.system_prompt },
    ];

    // Add history
    if (history && Array.isArray(history)) {
      messages.push(...history);
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Determine max tokens
    const maxTokens = agent.unlimited_tokens ? undefined : agent.max_tokens;

    let response: string;

    // Check if agent has a custom provider
    if (agent.provider_profile_id && agent.provider_profiles) {
      const provider = agent.provider_profiles;
      response = await callProviderAPI(provider, messages, agent.temperature, maxTokens);
    } else {
      // Use Lovable AI
      response = await callLovableAI(lovableApiKey!, messages, agent.temperature, maxTokens);
    }

    return new Response(JSON.stringify({ response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('One-on-one chat error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function callLovableAI(
  apiKey: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens?: number
): Promise<string> {
  const body: Record<string, unknown> = {
    model: 'google/gemini-2.5-flash',
    messages: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
    temperature,
  };

  if (maxTokens) {
    body.max_tokens = maxTokens;
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('Payment required. Please add credits to continue.');
    }
    const text = await response.text();
    console.error('Lovable AI error:', response.status, text);
    throw new Error('AI request failed');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response generated';
}

async function callProviderAPI(
  provider: { provider_type: string; api_key: string; endpoint?: string; model?: string },
  messages: ChatMessage[],
  temperature: number,
  maxTokens?: number
): Promise<string> {
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
        temperature,
      };
      if (maxTokens) body.max_tokens = maxTokens;
      break;

    case 'anthropic':
      url = endpoint || 'https://api.anthropic.com/v1/messages';
      headers = {
        'x-api-key': api_key,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      };
      // Anthropic uses different message format
      const systemMessage = messages.find(m => m.role === 'user' && messages.indexOf(m) === 0);
      const restMessages = messages.slice(1);
      body = {
        model: model || 'claude-sonnet-4-20250514',
        system: systemMessage?.content || '',
        messages: restMessages.map(m => ({ role: m.role, content: m.content })),
        temperature,
      };
      if (maxTokens) body.max_tokens = maxTokens;
      else body.max_tokens = 4096; // Anthropic requires max_tokens
      break;

    case 'perplexity':
      url = endpoint || 'https://api.perplexity.ai/chat/completions';
      headers = {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      };
      body = {
        model: model || 'llama-3.1-sonar-small-128k-online',
        messages,
        temperature,
      };
      if (maxTokens) body.max_tokens = maxTokens;
      break;

    default:
      // Custom provider - use OpenAI-compatible format
      if (!endpoint) {
        throw new Error('Custom provider requires an endpoint');
      }
      url = endpoint;
      headers = {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      };
      body = {
        model: model || 'default',
        messages,
        temperature,
      };
      if (maxTokens) body.max_tokens = maxTokens;
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

  const data = await response.json();

  // Handle different response formats
  if (provider_type === 'anthropic') {
    return data.content?.[0]?.text || 'No response generated';
  }

  return data.choices?.[0]?.message?.content || 'No response generated';
}