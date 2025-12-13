import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: "IMPORTANT: Respond in English. All your analysis, insights, and conclusions must be written in English.",
  it: "IMPORTANTE: Rispondi in italiano. Tutte le tue analisi, intuizioni e conclusioni devono essere scritte in italiano.",
};

interface ProviderProfile {
  id: string;
  provider_type: string;
  api_key: string;
  endpoint: string | null;
  model: string | null;
}

interface Agent {
  id: string;
  name: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  provider_profile_id: string | null;
}

interface Room {
  id: string;
  methodology: string;
  workflow_type: string;
  available_tools: any[];
}

// Call Lovable AI Gateway
async function callLovableAI(messages: any[], agent: Agent) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      max_tokens: agent.max_tokens || 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Lovable AI error:", error);
    if (response.status === 429) throw new Error("Rate limit exceeded");
    if (response.status === 402) throw new Error("Payment required");
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response";
}

// Call OpenAI API
async function callOpenAI(messages: any[], agent: Agent, provider: ProviderProfile) {
  const endpoint = provider.endpoint || "https://api.openai.com/v1/chat/completions";
  const model = provider.model || "gpt-4o-mini";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: agent.temperature,
      max_tokens: agent.max_tokens || 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenAI error:", error);
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response";
}

// Call Anthropic API
async function callAnthropic(messages: any[], agent: Agent, provider: ProviderProfile) {
  const endpoint = provider.endpoint || "https://api.anthropic.com/v1/messages";
  const model = provider.model || "claude-sonnet-4-20250514";

  // Convert messages to Anthropic format
  const systemMessage = messages.find((m: any) => m.role === "system")?.content || "";
  const conversationMessages = messages
    .filter((m: any) => m.role !== "system")
    .map((m: any) => ({ role: m.role, content: m.content }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "x-api-key": provider.api_key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      system: systemMessage,
      messages: conversationMessages,
      max_tokens: agent.max_tokens || 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Anthropic error:", error);
    throw new Error(`Anthropic error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "No response";
}

// Call Perplexity API (for research/search)
async function callPerplexity(messages: any[], agent: Agent, provider: ProviderProfile) {
  const endpoint = provider.endpoint || "https://api.perplexity.ai/chat/completions";
  const model = provider.model || "sonar";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Perplexity error:", error);
    throw new Error(`Perplexity error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "No response";
  const citations = data.citations || [];
  
  // Append citations if available
  if (citations.length > 0) {
    return `${content}\n\n**Sources:**\n${citations.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}`;
  }
  return content;
}

// Call Tavily API (for web search)
async function callTavily(query: string, provider: ProviderProfile) {
  const endpoint = provider.endpoint || "https://api.tavily.com/search";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: provider.api_key,
      query,
      search_depth: "advanced",
      max_results: 5,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Tavily error:", error);
    throw new Error(`Tavily error: ${response.status}`);
  }

  const data = await response.json();
  const results = data.results || [];
  
  if (results.length === 0) return "No search results found.";
  
  return results.map((r: any) => `**${r.title}**\n${r.content}\nSource: ${r.url}`).join("\n\n");
}

// Main function to call the appropriate provider
async function callProviderAPI(
  messages: any[], 
  agent: Agent, 
  providerProfile: ProviderProfile | null
): Promise<string> {
  if (!providerProfile) {
    console.log(`Agent ${agent.name}: Using Lovable AI`);
    return callLovableAI(messages, agent);
  }

  console.log(`Agent ${agent.name}: Using ${providerProfile.provider_type}`);

  switch (providerProfile.provider_type) {
    case "openai":
      return callOpenAI(messages, agent, providerProfile);
    case "anthropic":
      return callAnthropic(messages, agent, providerProfile);
    case "perplexity":
      return callPerplexity(messages, agent, providerProfile);
    case "tavily":
      // Tavily is a search tool, so we extract the query from the last message
      const lastMessage = messages[messages.length - 1]?.content || "";
      return callTavily(lastMessage, providerProfile);
    default:
      console.log(`Unknown provider type: ${providerProfile.provider_type}, falling back to Lovable AI`);
      return callLovableAI(messages, agent);
  }
}

// Get methodology-specific system prompt addition
function getMethodologyContext(methodology: string, round: number, maxRounds: number, locale: string): string {
  const isItalian = locale === 'it';
  
  const methodologies: Record<string, string> = {
    analytical_structured: isItalian 
      ? `Segui l'approccio strutturato McKinsey:
- Usa il principio MECE (mutuamente esclusivo, collettivamente esaustivo)
- Scomponi il problema in componenti logiche
- Costruisci una sintesi usando il Principio della Piramide
Fase corrente: ${round <= 2 ? "Definizione e scomposizione del problema" : round <= 4 ? "Analisi e raccolta dati" : "Sintesi e raccomandazioni"}`
      : `Follow the McKinsey structured approach:
- Use MECE principle (mutually exclusive, collectively exhaustive)
- Break down the problem into logical components
- Build up to a synthesis using the Pyramid Principle
Current phase: ${round <= 2 ? "Problem definition and decomposition" : round <= 4 ? "Analysis and data gathering" : "Synthesis and recommendations"}`,
    
    strategic_executive: isItalian
      ? `Applica il pensiero Balanced Scorecard:
- Considera le prospettive finanziaria, cliente, processi interni e apprendimento/crescita
- Allinea con gli obiettivi strategici a lungo termine
- Definisci KPI misurabili dove rilevante
Area di focus: ${round <= 2 ? "Analisi delle prospettive" : "Allineamento strategico e pianificazione azioni"}`
      : `Apply Balanced Scorecard thinking:
- Consider financial, customer, internal process, and learning/growth perspectives
- Align with long-term strategic objectives
- Define measurable KPIs where relevant
Focus area: ${round <= 2 ? "Perspective analysis" : "Strategic alignment and action planning"}`,
    
    creative_brainstorming: isItalian
      ? `Impegnati nel Design Thinking:
- Prima pensa in modo divergente, poi convergi
- Costruisci sulle idee degli altri ("Sì, e...")
- Sfida le assunzioni in modo creativo
Modalità: ${round <= maxRounds / 2 ? "Ideazione divergente - genera molte idee" : "Sintesi convergente - affina e combina le migliori idee"}`
      : `Engage in Design Thinking:
- Think divergently first, then converge
- Build on others' ideas ("Yes, and...")
- Challenge assumptions creatively
Mode: ${round <= maxRounds / 2 ? "Divergent ideation - generate many ideas" : "Convergent synthesis - refine and combine best ideas"}`,
    
    lean_iterative: isItalian
      ? `Applica la metodologia Lean Startup:
- Concentrati sui cicli Build-Measure-Learn
- Proponi ipotesi testabili
- Pensa in termini di MVP ed esperimenti
Fase: ${round === 1 ? "Formazione delle ipotesi" : round <= 3 ? "Design MVP/esperimento" : "Misurazione e apprendimento"}`
      : `Apply Lean Startup methodology:
- Focus on Build-Measure-Learn cycles
- Propose testable hypotheses
- Think in terms of MVP and experiments
Phase: ${round === 1 ? "Hypothesis formation" : round <= 3 ? "MVP/experiment design" : "Measurement and learning"}`,
    
    parallel_ensemble: isItalian
      ? `Fornisci la tua analisi esperta indipendente:
- Concentrati sulla tua prospettiva unica
- Non limitarti ad essere d'accordo con gli altri
- Offri intuizioni distinte che possono essere sintetizzate successivamente`
      : `Provide your independent expert analysis:
- Focus on your unique perspective
- Don't simply agree with others
- Offer distinct insights that can be synthesized later`,
  };

  return methodologies[methodology] || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, locale = 'en' } = await req.json();
    console.log("Starting session:", sessionId, "locale:", locale);

    const languageInstruction = LANGUAGE_INSTRUCTIONS[locale] || LANGUAGE_INSTRUCTIONS.en;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get session with room
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*, rooms(*)")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error("Session not found");
    }

    const room: Room | null = session.rooms;
    const methodology = room?.methodology || "group_chat";
    const workflowType = room?.workflow_type || "cyclic";

    // Get agents
    const agentIds = session.agent_config.map((a: any) => a.id);
    const { data: agents } = await supabase
      .from("agents")
      .select("*")
      .in("id", agentIds);

    if (!agents || agents.length === 0) {
      throw new Error("No agents found");
    }

    // Get provider profiles for agents that have one
    const providerIds = agents
      .filter((a: Agent) => a.provider_profile_id)
      .map((a: Agent) => a.provider_profile_id);
    
    let providerProfiles: Record<string, ProviderProfile> = {};
    if (providerIds.length > 0) {
      const { data: providers } = await supabase
        .from("provider_profiles")
        .select("*")
        .in("id", providerIds);
      
      if (providers) {
        providerProfiles = providers.reduce((acc: Record<string, ProviderProfile>, p: ProviderProfile) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    // Update status to running
    await supabase
      .from("sessions")
      .update({ status: "running" })
      .eq("id", sessionId);

    const transcript: any[] = [];

    // Run rounds based on workflow type
    for (let round = 1; round <= session.max_rounds; round++) {
      console.log(`Round ${round} of ${session.max_rounds} (${workflowType})`);
      
      const methodologyContext = getMethodologyContext(methodology, round, session.max_rounds, locale);

      if (workflowType === "concurrent") {
        // Parallel execution - all agents respond simultaneously
        const promises = agents.map(async (agent: Agent) => {
          const context = transcript.slice(-10).map((m: any) => `${m.agent_name}: ${m.content}`).join("\n\n");
          
          const messages = [
            { 
              role: "system", 
              content: `${agent.system_prompt}\n\n${languageInstruction}\n\n${methodologyContext}` 
            },
            {
              role: "user",
              content: `Topic: ${session.topic}\n${session.objective ? `Objective: ${session.objective}\n` : ""}\nRound ${round} of ${session.max_rounds}.\n\n${context ? `Previous discussion:\n${context}\n\n` : ""}Provide your perspective on this topic. Be concise (2-3 paragraphs max).`,
            },
          ];

          const providerProfile = agent.provider_profile_id 
            ? providerProfiles[agent.provider_profile_id] 
            : null;

          try {
            const content = await callProviderAPI(messages, agent, providerProfile);
            return {
              agent_id: agent.id,
              agent_name: agent.name,
              content,
              round,
              timestamp: new Date().toISOString(),
            };
          } catch (error) {
            console.error(`Error with agent ${agent.name}:`, error);
            return {
              agent_id: agent.id,
              agent_name: agent.name,
              content: `[Error: ${error instanceof Error ? error.message : "Unknown error"}]`,
              round,
              timestamp: new Date().toISOString(),
            };
          }
        });

        const roundMessages = await Promise.all(promises);
        transcript.push(...roundMessages);
      } else {
        // Sequential or cyclic - agents respond one by one
        for (const agent of agents) {
          const context = transcript.slice(-10).map((m: any) => `${m.agent_name}: ${m.content}`).join("\n\n");
          
          const messages = [
            { 
              role: "system", 
              content: `${agent.system_prompt}\n\n${languageInstruction}\n\n${methodologyContext}` 
            },
            {
              role: "user",
              content: `Topic: ${session.topic}\n${session.objective ? `Objective: ${session.objective}\n` : ""}\nRound ${round} of ${session.max_rounds}.\n\n${context ? `Previous discussion:\n${context}\n\n` : ""}Provide your perspective on this topic. Be concise (2-3 paragraphs max).`,
            },
          ];

          const providerProfile = agent.provider_profile_id 
            ? providerProfiles[agent.provider_profile_id] 
            : null;

          try {
            const content = await callProviderAPI(messages, agent, providerProfile);

            const message = {
              agent_id: agent.id,
              agent_name: agent.name,
              content,
              round,
              timestamp: new Date().toISOString(),
            };

            transcript.push(message);
          } catch (error) {
            console.error(`Error with agent ${agent.name}:`, error);
            transcript.push({
              agent_id: agent.id,
              agent_name: agent.name,
              content: `[Error: ${error instanceof Error ? error.message : "Unknown error"}]`,
              round,
              timestamp: new Date().toISOString(),
            });
          }

          // Update transcript in DB after each message
          await supabase
            .from("sessions")
            .update({ transcript, current_round: round })
            .eq("id", sessionId);
        }
      }

      // Update transcript after each round for concurrent workflow
      if (workflowType === "concurrent") {
        await supabase
          .from("sessions")
          .update({ transcript, current_round: round })
          .eq("id", sessionId);
      }
    }

    // Generate action items with methodology-aware synthesis
    const isItalian = locale === 'it';
    const synthesisPrompt = methodology === "analytical_structured" 
      ? (isItalian 
          ? "Usando il Principio della Piramide, sintetizza questa discussione in 3-5 azioni chiave, iniziando dalla raccomandazione più importante:"
          : "Using the Pyramid Principle, synthesize this discussion into 3-5 key action items, starting with the most important recommendation:")
      : methodology === "strategic_executive"
      ? (isItalian
          ? "Estrai 3-5 azioni strategiche allineate alle prospettive della balanced scorecard (finanziaria, cliente, processi, crescita):"
          : "Extract 3-5 strategic action items aligned with the balanced scorecard perspectives (financial, customer, process, growth):")
      : methodology === "lean_iterative"
      ? (isItalian
          ? "Identifica 3-5 ipotesi testabili e i prossimi esperimenti da eseguire:"
          : "Identify 3-5 testable hypotheses and next experiments to run:")
      : (isItalian
          ? "Basandoti su questa deliberazione, estrai 3-5 azioni chiave:"
          : "Based on this deliberation, extract 3-5 key action items:");

    const summaryMessages = [
      {
        role: "system",
        content: isItalian 
          ? "Sei un esperto nel sintetizzare discussioni in azioni concrete. Rispondi in italiano."
          : "You are an expert at synthesizing discussions into actionable items. Respond in English.",
      },
      {
        role: "user",
        content: `${synthesisPrompt}\n\nTopic: ${session.topic}\n\n${transcript.map((m) => `${m.agent_name}: ${m.content}`).join("\n\n")}\n\nReturn only a JSON array of strings, each being an action item.`,
      },
    ];

    let actionItems: string[] = [];
    try {
      const summaryContent = await callLovableAI(summaryMessages, { 
        max_tokens: 1024, 
        temperature: 0.3 
      } as Agent);
      const match = summaryContent.match(/\[[\s\S]*\]/);
      if (match) actionItems = JSON.parse(match[0]);
    } catch (error) {
      console.log("Failed to generate action items:", error);
    }

    // Complete session
    await supabase
      .from("sessions")
      .update({
        status: "completed",
        transcript,
        action_items: actionItems,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Session error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
