import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: "IMPORTANT: All output text (room name, descriptions, objective templates, tips, agent names/roles, etc.) MUST be in English.",
  it: "IMPORTANTE: Tutto il testo prodotto (nome della room, descrizioni, template degli obiettivi, suggerimenti, nomi/ruoli degli agenti, ecc.) DEVE essere in italiano.",
};

const METHODOLOGIES = `
## Available Methodologies:
1. **analytical_structured** - McKinsey-style issue decomposition with MECE principle. Best for complex analysis requiring structured breakdown.
2. **strategic_executive** - OKR/Balanced Scorecard perspective alignment. Best for strategic decisions requiring multiple stakeholder views.
3. **creative_brainstorming** - Design Thinking with role-based contribution. Best for ideation and creative problem-solving.
4. **lean_iterative** - Build-measure-learn cycles. Best for iterative refinement and hypothesis testing.
5. **parallel_ensemble** - Concurrent analysis with aggregation. Best for comprehensive evaluation requiring multiple independent perspectives.

## Available Workflows:
1. **cyclic** - Agents take turns in rounds, building on each other's contributions. Good for iterative refinement.
2. **sequential** - Agents contribute in a fixed order, passing work to the next. Good for pipeline-style processing.
3. **parallel** - All agents contribute simultaneously, then synthesize. Good for independent analysis.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, archimedePrompt, userId, conversationHistory, mode, locale = 'en' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!description) {
      throw new Error('Description is required');
    }

    console.log('Archimede design request, mode:', mode || 'standard', 'locale:', locale);

    const languageInstruction = LANGUAGE_INSTRUCTIONS[locale] || LANGUAGE_INSTRUCTIONS.en;

    // Get available agents for context
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, description, is_system, system_prompt")
      .or(`user_id.eq.${userId},is_system.eq.true`);

    const agentContext = agents?.map(a => 
      `- **${a.name}** (${a.id}): ${a.description || "No description"}${a.is_system ? ' [SYSTEM]' : ''}`
    ).join("\n") || "No agents available";

    // Get existing rooms for context
    const { data: rooms } = await supabase
      .from("rooms")
      .select("name, description, methodology, workflow_type")
      .or(`user_id.eq.${userId},is_system.eq.true`)
      .limit(10);

    const roomsContext = rooms?.map(r => 
      `- ${r.name}: ${r.description || 'No description'} (${r.methodology}, ${r.workflow_type})`
    ).join("\n") || "No rooms available";

    const enhancedSystemPrompt = `${archimedePrompt || 'You are Archimede, an expert Room Designer for multi-agent deliberation systems.'}

${languageInstruction}

${METHODOLOGIES}

## Available Agents (use these exact IDs for agent_ids):
${agentContext}

## Existing Rooms for Reference:
${roomsContext}

## Your Task:
Design optimal Room configurations for deliberation, analysis, and decision-making. Select the best methodology, workflow, and agents based on the user's needs.

## Important Guidelines:
1. Select agents by their exact UUIDs from the available list above.
2. If an ideal agent doesn't exist, include it in the "missing_agents" array with a detailed Atlas prompt to create it.
3. For highly specialized one-time needs, suggest "ephemeral_agents" - temporary agents that exist only for this session.
4. Be conversational and helpful. Ask clarifying questions if the request is vague.
5. Provide a complete room specification when you have enough information.`;

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: enhancedSystemPrompt }
    ];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current user message
    messages.push({ 
      role: 'user', 
      content: description
    });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_room_specification',
              description: 'Create a complete Room specification when you have enough information to design the room',
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
                    description: 'UUIDs of existing agents to include in this Room'
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
                  missing_agents: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        suggested_name: { type: 'string' },
                        expertise: { type: 'string' },
                        why_needed: { type: 'string' },
                        atlas_prompt: { type: 'string', description: 'Detailed prompt to give to Atlas for creating this agent' }
                      },
                      required: ['suggested_name', 'expertise', 'why_needed', 'atlas_prompt']
                    },
                    description: 'Agents that would be ideal but do not exist yet - include Atlas prompts for creating them'
                  },
                  ephemeral_agents: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        system_prompt: { type: 'string' },
                        role_in_room: { type: 'string' }
                      },
                      required: ['name', 'system_prompt', 'role_in_room']
                    },
                    description: 'Throwaway agents for this specific session only - hyper-specialized for the task at hand'
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
        tool_choice: 'auto'
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

    const message = data.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    // If there's a tool call, parse and return the room specification
    if (toolCall && toolCall.function.name === 'create_room_specification') {
      const roomSpec = JSON.parse(toolCall.function.arguments);
      console.log('Room specification parsed:', roomSpec.name);

      return new Response(JSON.stringify({ 
        room: roomSpec, 
        availableAgents: agents,
        response: locale === 'it' 
          ? `Ho progettato una room chiamata **"${roomSpec.name}"** per te.`
          : `I've designed a room called **"${roomSpec.name}"** for you.`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Otherwise return conversational response
    const textResponse = message?.content || (locale === 'it' 
      ? "Ho bisogno di più informazioni sulle tue esigenze di deliberazione. Puoi descrivere quale decisione o analisi stai cercando di fare?"
      : "I need more information about your deliberation needs. Can you describe what decision or analysis you're trying to make?");
    
    return new Response(JSON.stringify({ 
      response: textResponse,
      availableAgents: agents
    }), {
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
