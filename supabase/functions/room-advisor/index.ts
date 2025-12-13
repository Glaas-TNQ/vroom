import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const METHODOLOGY_DESCRIPTIONS = {
  analytical_structured: {
    name: "McKinsey Strategic Analysis",
    description: "MECE decomposition, issue trees, Pyramid Principle approach",
    bestFor: ["Complex problem-solving", "Due diligence", "Financial analysis", "Data-driven decisions"],
    workflow: "sequential_pipeline",
    typicalRounds: "5-8",
  },
  strategic_executive: {
    name: "OKR/BSC Planning",
    description: "Balanced Scorecard with 4 perspectives (financial, customer, process, growth)",
    bestFor: ["Strategic planning", "KPI definition", "Organizational alignment", "Quarterly reviews"],
    workflow: "cyclic",
    typicalRounds: "4-6",
  },
  creative_brainstorming: {
    name: "Design Thinking Brainstorming",
    description: "Divergent then convergent thinking, 'Yes, and...' building",
    bestFor: ["Innovation", "Product ideation", "Problem finding", "Naming & branding"],
    workflow: "cyclic",
    typicalRounds: "3-5",
  },
  lean_iterative: {
    name: "Lean Startup Validation",
    description: "Build-Measure-Learn cycles, MVP thinking, hypothesis testing",
    bestFor: ["Idea validation", "MVP design", "Pivot decisions", "Startup strategy"],
    workflow: "cyclic",
    typicalRounds: "3-5",
  },
  parallel_ensemble: {
    name: "Multi-Perspective Analysis",
    description: "Independent parallel analysis from specialists, then synthesis",
    bestFor: ["Critical decisions", "Risk assessment", "Investment decisions", "M&A evaluation"],
    workflow: "concurrent",
    typicalRounds: "3-4",
  },
};

interface ProviderProfile {
  id: string;
  provider_type: string;
  api_key: string;
  endpoint: string | null;
  model: string | null;
}

async function callProviderAPI(provider: ProviderProfile, messages: any[], tools?: any[]): Promise<any> {
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
        ...(tools && { tools, tool_choice: { type: 'function', function: { name: 'provide_room_recommendation' } } }),
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
      };
      if (tools) {
        body.tools = tools.map(t => ({
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters,
        }));
        body.tool_choice = { type: 'tool', name: 'provide_room_recommendation' };
      }
      break;

    default:
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId, conversationHistory } = await req.json();
    console.log("Room Advisor request from user:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's provider
    let provider: ProviderProfile | null = null;
    
    if (userId) {
      // Try to get user's default provider
      const { data } = await supabase
        .from('provider_profiles_decrypted')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();
      provider = data;
    }
    
    if (!provider && userId) {
      // Try to get any provider for the user
      const { data } = await supabase
        .from('provider_profiles_decrypted')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .single();
      provider = data;
    }

    if (!provider) {
      return new Response(JSON.stringify({ 
        error: 'No API provider configured. Please configure a provider in Settings first.',
        response: 'I need an API provider to help you. Please configure one in Settings → API Providers.'
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's available agents with full details
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, description, icon, color, is_system, system_prompt")
      .or(`user_id.eq.${userId},is_system.eq.true`);

    // Get available rooms
    const { data: rooms } = await supabase
      .from("rooms")
      .select("*")
      .or(`user_id.eq.${userId},is_system.eq.true`);

    const agentsList = agents?.map(a => 
      `- **${a.name}** (ID: ${a.id}): ${a.description || "No description"} [${a.is_system ? "System" : "Custom"}]`
    ).join("\n") || "No agents available";

    const agentDetails = agents?.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      is_system: a.is_system,
      expertise: a.description?.substring(0, 100) || ""
    })) || [];

    const roomsList = rooms?.map(r => 
      `- **${r.name}** (${r.methodology}): ${r.description} [${r.max_rounds} rounds, ${r.workflow_type}]`
    ).join("\n") || "No rooms available";

    const methodologiesInfo = Object.entries(METHODOLOGY_DESCRIPTIONS).map(([key, m]) => 
      `### ${m.name} (\`${key}\`)
${m.description}
- **Best for**: ${m.bestFor.join(", ")}
- **Typical workflow**: ${m.workflow}
- **Typical rounds**: ${m.typicalRounds}`
    ).join("\n\n");

    const systemPrompt = `You are Archimede's Room Advisor, a specialized AI that helps users configure optimal deliberation rooms for multi-agent sessions.

## YOUR CAPABILITIES
1. Analyze user objectives and recommend the best room configuration
2. Suggest which existing agents should participate
3. Identify gaps where new agents would be beneficial
4. Provide actionable next steps

## AVAILABLE METHODOLOGIES

${methodologiesInfo}

## AVAILABLE AGENTS
${agentsList}

## EXISTING ROOMS
${roomsList}

## YOUR RESPONSE FORMAT

When providing recommendations, structure your response clearly:

1. **Recommended Methodology**: Which methodology fits best and why
2. **Suggested Room**: Existing room to use OR suggest creating a new one
3. **Agent Team**: List the agents that should participate with their roles
4. **Configuration**: Suggested rounds, workflow type, tools
5. **Missing Agents** (if any): Describe agents that would be valuable but don't exist yet

For missing agents, provide a clear description that could be used to create them with Atlas.

## IMPORTANT INSTRUCTIONS
- Always explain your reasoning
- Be specific about agent roles in the deliberation
- When suggesting missing agents, describe their expertise clearly
- Ask clarifying questions if the user's objective is unclear
- Consider complementarity between agents (different perspectives, avoid redundancy)

You are conversational and helpful. Guide users toward the optimal room configuration for their specific needs.`;

    // Build messages with conversation history
    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt }
    ];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
    messages.push({ role: "user", content: message });

    const tools = [
      {
        type: "function",
        function: {
          name: "provide_room_recommendation",
          description: "Provide a structured room recommendation with agent suggestions",
          parameters: {
            type: "object",
            properties: {
              response_text: { type: "string", description: "The full conversational response to show the user" },
              recommendation: {
                type: "object",
                properties: {
                  methodology: { type: "string", enum: ["analytical_structured", "strategic_executive", "creative_brainstorming", "lean_iterative", "parallel_ensemble"] },
                  workflow_type: { type: "string", enum: ["cyclic", "sequential_pipeline", "concurrent"] },
                  max_rounds: { type: "number" },
                  suggested_room_name: { type: "string" },
                  suggested_description: { type: "string" },
                  objective_template: { type: "string" }
                }
              },
              suggested_agents: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    agent_id: { type: "string" },
                    agent_name: { type: "string" },
                    role_in_room: { type: "string" }
                  }
                }
              },
              missing_agents: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    suggested_name: { type: "string" },
                    expertise: { type: "string" },
                    why_needed: { type: "string" },
                    atlas_prompt: { type: "string" }
                  }
                }
              },
              ready_to_create: { type: "boolean", description: "True if the recommendation is complete enough to create a room" }
            },
            required: ["response_text"]
          }
        }
      }
    ];

    const data = await callProviderAPI(provider, messages, tools);
    
    let result = {
      response: "I'm sorry, I couldn't process your request.",
      recommendation: null as any,
      suggested_agents: [] as any[],
      missing_agents: [] as any[],
      ready_to_create: false,
      agents: agentDetails,
    };

    // Handle different response formats
    if (provider.provider_type === 'anthropic') {
      const toolUse = data.content?.find((c: any) => c.type === 'tool_use');
      if (toolUse && toolUse.name === 'provide_room_recommendation') {
        const parsed = toolUse.input;
        result = {
          response: parsed.response_text || result.response,
          recommendation: parsed.recommendation || null,
          suggested_agents: parsed.suggested_agents || [],
          missing_agents: parsed.missing_agents || [],
          ready_to_create: parsed.ready_to_create || false,
          agents: agentDetails,
        };
      } else {
        const textBlock = data.content?.find((c: any) => c.type === 'text');
        if (textBlock) {
          result.response = textBlock.text;
        }
      }
    } else {
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall && toolCall.function.name === "provide_room_recommendation") {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          result = {
            response: parsed.response_text || result.response,
            recommendation: parsed.recommendation || null,
            suggested_agents: parsed.suggested_agents || [],
            missing_agents: parsed.missing_agents || [],
            ready_to_create: parsed.ready_to_create || false,
            agents: agentDetails,
          };
        } catch (e) {
          console.error("Failed to parse tool call:", e);
        }
      } else {
        // Fallback to plain text response
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          result.response = content;
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Room Advisor error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
