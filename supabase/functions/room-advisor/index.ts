import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const METHODOLOGY_DESCRIPTIONS = {
  analytical_structured: {
    name: "Analisi Strategica McKinsey",
    description: "Approccio analitico-strutturato con scomposizione MECE e Pyramid Principle",
    bestFor: ["Problem solving complessi", "Due diligence", "Analisi finanziarie", "Decisioni basate su dati"],
  },
  strategic_executive: {
    name: "Pianificazione OKR/BSC",
    description: "Balanced Scorecard per allineare attività a obiettivi strategici",
    bestFor: ["Pianificazione strategica", "Definizione KPI", "Allineamento organizzativo", "Review trimestrali"],
  },
  creative_brainstorming: {
    name: "Brainstorming Creativo",
    description: "Design Thinking con pensiero divergente e convergente",
    bestFor: ["Innovazione", "Ideazione prodotti", "Problem finding", "Naming e branding"],
  },
  lean_iterative: {
    name: "Validazione Lean Startup",
    description: "Ciclo Build-Measure-Learn per validare ipotesi rapidamente",
    bestFor: ["Validazione idee", "MVP design", "Pivot decisions", "Startup strategy"],
  },
  parallel_ensemble: {
    name: "Analisi Multi-Prospettiva",
    description: "Analisi parallele indipendenti da specialisti diversi",
    bestFor: ["Decisioni critiche", "Risk assessment", "Investment decisions", "M&A evaluation"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();
    console.log("Room Advisor request from user:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's available agents
    const { data: agents } = await supabase
      .from("agents")
      .select("id, name, description, icon, is_system")
      .or(`user_id.eq.${userId},is_system.eq.true`);

    // Get available rooms
    const { data: rooms } = await supabase
      .from("rooms")
      .select("*")
      .or(`user_id.eq.${userId},is_system.eq.true`);

    const agentsList = agents?.map(a => `- ${a.name}: ${a.description || "No description"} ${a.is_system ? "(System)" : "(Custom)"}`).join("\n") || "No agents available";
    const roomsList = rooms?.map(r => `- ${r.name} (${r.methodology}): ${r.description}`).join("\n") || "No rooms available";

    const systemPrompt = `You are a Room Advisor AI, specialized in helping users choose the best room configuration and agents for their deliberation sessions.

You have deep knowledge of these methodologies:

1. **Analytical-Structured (McKinsey)**: MECE decomposition, issue trees, Pyramid Principle. Best for complex problem-solving, financial analysis, due diligence.

2. **Strategic-Executive (OKR/BSC)**: Balanced Scorecard with 4 perspectives (financial, customer, process, growth). Best for strategic planning, KPI definition, organizational alignment.

3. **Creative Brainstorming (Design Thinking)**: Divergent then convergent thinking, "Yes, and..." building. Best for innovation, ideation, problem finding.

4. **Lean Iterative (Lean Startup)**: Build-Measure-Learn cycles, MVP thinking, hypothesis testing. Best for validation, pivoting decisions, startup strategy.

5. **Parallel Ensemble**: Independent parallel analysis from multiple specialists, then synthesis. Best for critical decisions, risk assessment, investment decisions.

AVAILABLE AGENTS:
${agentsList}

AVAILABLE ROOMS:
${roomsList}

Based on the user's request, recommend:
1. The most suitable methodology
2. Which existing room to use OR suggest creating a new one
3. Which agents would work best together
4. Suggested number of rounds
5. Any specific configuration tips

Be conversational, helpful, and explain your reasoning. Ask clarifying questions if needed.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 1024,
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
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't process your request.";

    return new Response(JSON.stringify({ 
      response: content,
      agents: agents || [],
      rooms: rooms || [],
    }), {
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
