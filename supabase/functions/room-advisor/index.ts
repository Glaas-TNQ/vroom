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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "provide_room_recommendation",
              description: "Provide a structured room recommendation with agent suggestions",
              parameters: {
                type: "object",
                properties: {
                  response_text: {
                    type: "string",
                    description: "The full conversational response to show the user"
                  },
                  recommendation: {
                    type: "object",
                    properties: {
                      methodology: {
                        type: "string",
                        enum: ["analytical_structured", "strategic_executive", "creative_brainstorming", "lean_iterative", "parallel_ensemble"]
                      },
                      workflow_type: {
                        type: "string",
                        enum: ["cyclic", "sequential_pipeline", "concurrent"]
                      },
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
                        atlas_prompt: { type: "string", description: "A prompt to give Atlas to create this agent" }
                      }
                    }
                  },
                  ready_to_create: {
                    type: "boolean",
                    description: "True if the recommendation is complete enough to create a room"
                  }
                },
                required: ["response_text"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "provide_room_recommendation" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    
    let result = {
      response: "I'm sorry, I couldn't process your request.",
      recommendation: null as any,
      suggested_agents: [] as any[],
      missing_agents: [] as any[],
      ready_to_create: false,
      agents: agentDetails,
    };

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
