import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, archimedePrompt, userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!description) {
      throw new Error('Description is required');
    }

    console.log('Designing room with Archimede for description:', description.substring(0, 100));

    // Get available agents for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, description, is_system")
      .or(`user_id.eq.${userId},is_system.eq.true`);

    const agentContext = agents?.map(a => `- ${a.name} (${a.id}): ${a.description || "No description"}`).join("\n") || "No agents available";

    const enhancedPrompt = `${archimedePrompt}

---

## Available Agents (use these IDs for agent_ids)
${agentContext}

When selecting agents, use their exact UUIDs from the list above.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: enhancedPrompt },
          { 
            role: 'user', 
            content: `Design a Room for the following objective:\n\n${description}\n\nProvide the complete Room specification following your framework. Make sure to select appropriate agents from the available list.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_room_specification',
              description: 'Create a complete Room specification with all required fields',
              parameters: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'A descriptive, memorable name for the Room'
                  },
                  short_description: {
                    type: 'string',
                    description: 'A 2-3 sentence summary of the Room purpose and approach. Max 200 characters.'
                  },
                  methodology: {
                    type: 'string',
                    enum: ['analytical_structured', 'strategic_executive', 'creative_brainstorming', 'lean_iterative', 'parallel_ensemble'],
                    description: 'The deliberation methodology'
                  },
                  methodology_justification: {
                    type: 'string',
                    description: 'Why this methodology was chosen'
                  },
                  workflow_type: {
                    type: 'string',
                    enum: ['cyclic', 'sequential', 'parallel'],
                    description: 'How agents interact during deliberation'
                  },
                  workflow_justification: {
                    type: 'string',
                    description: 'Why this workflow was chosen'
                  },
                  max_rounds: {
                    type: 'number',
                    description: 'Recommended number of deliberation rounds (3-15)'
                  },
                  max_rounds_rationale: {
                    type: 'string',
                    description: 'Why this number of rounds'
                  },
                  agent_ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'UUIDs of agents to include in this Room'
                  },
                  agent_roles: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        agent_name: { type: 'string' },
                        role_in_room: { type: 'string' }
                      }
                    },
                    description: 'Each agent role and contribution in this Room'
                  },
                  available_tools: {
                    type: 'array',
                    items: { 
                      type: 'string',
                      enum: ['perplexity', 'tavily']
                    },
                    description: 'Research tools to enable (perplexity, tavily)'
                  },
                  require_consensus: {
                    type: 'boolean',
                    description: 'Whether agents must reach consensus'
                  },
                  objective_template: {
                    type: 'string',
                    description: 'A template for session objectives with placeholders like [CONTEXT], [FOCUS], [OUTPUTS]'
                  },
                  ideal_use_cases: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'When to use this Room'
                  },
                  not_suitable_for: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'When NOT to use this Room'
                  },
                  session_tips: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tips for effective sessions in this Room'
                  }
                },
                required: ['name', 'short_description', 'methodology', 'workflow_type', 'max_rounds', 'agent_ids', 'objective_template'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'create_room_specification' } }
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
    if (!toolCall || toolCall.function.name !== 'create_room_specification') {
      throw new Error('Unexpected response format from AI');
    }

    const roomSpec = JSON.parse(toolCall.function.arguments);
    console.log('Room specification parsed:', roomSpec.name);

    return new Response(JSON.stringify({ room: roomSpec, availableAgents: agents }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in design-room function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
