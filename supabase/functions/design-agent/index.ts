import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, atlasPrompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!description) {
      throw new Error('Description is required');
    }

    console.log('Designing agent with Atlas for description:', description.substring(0, 100));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: atlasPrompt },
          { 
            role: 'user', 
            content: `Design an agent for the following requirement:\n\n${description}\n\nProvide the complete agent specification following your framework. Focus especially on generating a complete, production-ready system prompt that I can use directly.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_agent_specification',
              description: 'Create a complete agent specification with all required fields',
              parameters: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'The name of the agent'
                  },
                  short_description: {
                    type: 'string',
                    description: 'A 2-3 sentence summary of the agent competencies and expertise for quick reference. Max 200 characters. This will be used for agent selection and token-efficient context.'
                  },
                  codename: {
                    type: 'string',
                    description: 'Machine-friendly identifier (snake_case)'
                  },
                  mandate: {
                    type: 'string',
                    description: 'One-sentence mandate/purpose'
                  },
                  primary_domain: {
                    type: 'string',
                    description: 'The primary domain of expertise'
                  },
                  secondary_domains: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Secondary domains if any'
                  },
                  exclusions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'What this agent explicitly does NOT do'
                  },
                  reasoning_mode: {
                    type: 'string',
                    description: 'e.g. analytical, procedural, adversarial, generative'
                  },
                  depth_level: {
                    type: 'string',
                    description: 'e.g. IC-level, Staff-level, Principal-level'
                  },
                  decision_bias: {
                    type: 'string',
                    description: 'e.g. risk-averse, exploratory, conservative'
                  },
                  core_responsibilities: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of core responsibilities'
                  },
                  non_responsibilities: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of things this agent does NOT do'
                  },
                  system_prompt: {
                    type: 'string',
                    description: 'Complete production-ready system prompt'
                  },
                  suggested_temperature: {
                    type: 'number',
                    description: 'Suggested temperature setting (0-1)'
                  },
                  suggested_icon: {
                    type: 'string',
                    enum: ['briefcase', 'scale', 'target', 'brain', 'chart', 'bot', 'lightbulb', 'presentation', 'heart-handshake', 'shield', 'zap', 'search', 'users', 'code', 'database'],
                    description: 'Suggested icon based on agent type'
                  }
                },
                required: ['name', 'short_description', 'codename', 'mandate', 'primary_domain', 'core_responsibilities', 'system_prompt', 'suggested_temperature', 'suggested_icon'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_agent_specification' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add funds to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'create_agent_specification') {
      throw new Error('Unexpected response format from AI');
    }

    const agentSpec = JSON.parse(toolCall.function.arguments);
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
