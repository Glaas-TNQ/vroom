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
      max_completion_tokens: agent.max_tokens || 1024,
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

    // Get provider profiles for agents that have one (using decrypted view for server-side access)
    const providerIds = agents
      .filter((a: Agent) => a.provider_profile_id)
      .map((a: Agent) => a.provider_profile_id);
    
    let providerProfiles: Record<string, ProviderProfile> = {};
    if (providerIds.length > 0) {
      // Use the decrypted view which is only accessible via service role
      const { data: providers } = await supabase
        .from("provider_profiles_decrypted")
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

    // === FINAL SYNTHESIS PHASE ===
    // After all rounds, generate a comprehensive final report with actionable deliverables
    console.log("Generating final synthesis report...");
    
    const isItalian = locale === 'it';
    const transcriptSummary = transcript.map((m) => `**${m.agent_name}** (Round ${m.round}):\n${m.content}`).join("\n\n---\n\n");
    
    // Build the final report prompt based on methodology
    const reportPromptByMethodology: Record<string, string> = {
      analytical_structured: isItalian 
        ? `Genera un RAPPORTO ESECUTIVO completo seguendo il Principio della Piramide McKinsey.

## Struttura Richiesta:

### 1. RACCOMANDAZIONE PRINCIPALE
Una frase chiara che risponde alla domanda centrale.

### 2. SINTESI ESECUTIVA
3-4 punti chiave che supportano la raccomandazione (max 100 parole).

### 3. ANALISI DELLE ARGOMENTAZIONI
Per ogni prospettiva discussa:
- Punto chiave
- Evidenze/ragionamento
- Implicazioni

### 4. RISCHI E MITIGAZIONI
Rischi identificati e strategie di mitigazione proposte.

### 5. PIANO D'AZIONE
Azioni concrete con:
- Cosa fare
- Chi è responsabile (ruolo suggerito)
- Timeline suggerita
- KPI/Metriche di successo

### 6. PROSSIMI PASSI IMMEDIATI
Le prime 3 azioni da intraprendere entro 7 giorni.`
        : `Generate a complete EXECUTIVE REPORT following the McKinsey Pyramid Principle.

## Required Structure:

### 1. MAIN RECOMMENDATION
A clear sentence answering the central question.

### 2. EXECUTIVE SUMMARY
3-4 key points supporting the recommendation (max 100 words).

### 3. ARGUMENT ANALYSIS
For each perspective discussed:
- Key point
- Evidence/reasoning
- Implications

### 4. RISKS AND MITIGATIONS
Identified risks and proposed mitigation strategies.

### 5. ACTION PLAN
Concrete actions with:
- What to do
- Who is responsible (suggested role)
- Suggested timeline
- KPIs/Success metrics

### 6. IMMEDIATE NEXT STEPS
The first 3 actions to take within 7 days.`,
      
      strategic_executive: isItalian
        ? `Genera un RAPPORTO STRATEGICO usando il framework Balanced Scorecard.

## Struttura Richiesta:

### 1. DECISIONE STRATEGICA
Raccomandazione finale chiara e allineata agli obiettivi.

### 2. IMPATTO PER PROSPETTIVA
#### Finanziaria
- Impatto atteso su ricavi/costi
- ROI stimato

#### Cliente
- Impatto sulla proposta di valore
- Effetti sulla soddisfazione

#### Processi Interni
- Cambiamenti operativi necessari
- Efficienza attesa

#### Apprendimento e Crescita
- Competenze da sviluppare
- Innovazioni da implementare

### 3. OKR PROPOSTI
3-5 Objectives con Key Results misurabili.

### 4. PIANO DI IMPLEMENTAZIONE
Fasi, milestone e responsabilità.

### 5. PROSSIMI PASSI
Azioni immediate per avviare l'implementazione.`
        : `Generate a STRATEGIC REPORT using the Balanced Scorecard framework.

## Required Structure:

### 1. STRATEGIC DECISION
Clear final recommendation aligned with objectives.

### 2. IMPACT BY PERSPECTIVE
#### Financial
- Expected revenue/cost impact
- Estimated ROI

#### Customer
- Impact on value proposition
- Satisfaction effects

#### Internal Processes
- Required operational changes
- Expected efficiency

#### Learning and Growth
- Skills to develop
- Innovations to implement

### 3. PROPOSED OKRs
3-5 Objectives with measurable Key Results.

### 4. IMPLEMENTATION PLAN
Phases, milestones and responsibilities.

### 5. NEXT STEPS
Immediate actions to start implementation.`,

      creative_brainstorming: isItalian
        ? `Genera un RAPPORTO CREATIVO che cattura le idee generate.

## Struttura Richiesta:

### 1. CONCEPT VINCENTE
L'idea principale emersa dalla sessione.

### 2. IDEE CHIAVE
Le 3-5 migliori idee con breve descrizione.

### 3. MAPPA DELLE OPPORTUNITÀ
Come le idee si collegano e potenziano a vicenda.

### 4. CONCEPT BRIEF
Per l'idea principale:
- Descrizione del concept
- Target audience
- Value proposition
- Differenziazione

### 5. PROTOTIPO SUGGERITO
Come testare rapidamente l'idea (MVP).

### 6. PROSSIMI PASSI CREATIVI
Azioni per sviluppare e validare le idee.`
        : `Generate a CREATIVE REPORT capturing the generated ideas.

## Required Structure:

### 1. WINNING CONCEPT
The main idea that emerged from the session.

### 2. KEY IDEAS
The 3-5 best ideas with brief descriptions.

### 3. OPPORTUNITY MAP
How ideas connect and enhance each other.

### 4. CONCEPT BRIEF
For the main idea:
- Concept description
- Target audience
- Value proposition
- Differentiation

### 5. SUGGESTED PROTOTYPE
How to quickly test the idea (MVP).

### 6. CREATIVE NEXT STEPS
Actions to develop and validate ideas.`,

      lean_iterative: isItalian
        ? `Genera un RAPPORTO LEAN con ipotesi testabili.

## Struttura Richiesta:

### 1. IPOTESI PRINCIPALE
L'ipotesi core da validare.

### 2. IPOTESI SECONDARIE
Altre ipotesi identificate durante la discussione.

### 3. PIANO DI ESPERIMENTI
Per ogni ipotesi:
- Esperimento proposto
- Metrica di successo
- Tempo stimato
- Risorse necessarie

### 4. MVP PROPOSTO
Descrizione del prodotto minimo per validare.

### 5. METRICHE DA MONITORARE
KPI e criteri di successo/fallimento.

### 6. PIVOT TRIGGERS
Condizioni che indicherebbero necessità di cambiare direzione.

### 7. PROSSIMO CICLO
Azioni per il prossimo ciclo Build-Measure-Learn.`
        : `Generate a LEAN REPORT with testable hypotheses.

## Required Structure:

### 1. MAIN HYPOTHESIS
The core hypothesis to validate.

### 2. SECONDARY HYPOTHESES
Other hypotheses identified during discussion.

### 3. EXPERIMENT PLAN
For each hypothesis:
- Proposed experiment
- Success metric
- Estimated time
- Required resources

### 4. PROPOSED MVP
Description of minimum product to validate.

### 5. METRICS TO MONITOR
KPIs and success/failure criteria.

### 6. PIVOT TRIGGERS
Conditions indicating need to change direction.

### 7. NEXT CYCLE
Actions for the next Build-Measure-Learn cycle.`,

      parallel_ensemble: isItalian
        ? `Genera un RAPPORTO DI SINTESI MULTI-PROSPETTIVA.

## Struttura Richiesta:

### 1. VERDETTO CONSOLIDATO
La conclusione che integra tutte le prospettive.

### 2. SINTESI PER PROSPETTIVA
Per ogni esperto:
- Punto di vista chiave
- Forza dell'argomentazione
- Contributo unico

### 3. AREE DI CONSENSO
Punti su cui tutti gli esperti concordano.

### 4. AREE DI DISSENSO
Punti di divergenza e come risolverli.

### 5. RACCOMANDAZIONE INTEGRATA
Decisione che bilancia tutte le prospettive.

### 6. PIANO D'AZIONE CONSOLIDATO
Azioni concrete che tengono conto di tutti gli input.`
        : `Generate a MULTI-PERSPECTIVE SYNTHESIS REPORT.

## Required Structure:

### 1. CONSOLIDATED VERDICT
The conclusion integrating all perspectives.

### 2. SYNTHESIS BY PERSPECTIVE
For each expert:
- Key viewpoint
- Argument strength
- Unique contribution

### 3. AREAS OF CONSENSUS
Points all experts agree on.

### 4. AREAS OF DISSENT
Points of divergence and how to resolve them.

### 5. INTEGRATED RECOMMENDATION
Decision balancing all perspectives.

### 6. CONSOLIDATED ACTION PLAN
Concrete actions considering all inputs.`,
    };

    const defaultReportPrompt = isItalian
      ? `Genera un RAPPORTO FINALE completo.

## Struttura Richiesta:

### 1. SINTESI ESECUTIVA
Risposta chiara alla domanda/topic principale.

### 2. PUNTI CHIAVE
I 3-5 insight più importanti emersi dalla discussione.

### 3. RACCOMANDAZIONI
Decisioni e azioni raccomandate.

### 4. CONSIDERAZIONI
Rischi, opportunità e fattori da monitorare.

### 5. PIANO D'AZIONE
Azioni concrete con priorità e timeline suggerite.

### 6. PROSSIMI PASSI
Le prime azioni immediate da intraprendere.`
      : `Generate a complete FINAL REPORT.

## Required Structure:

### 1. EXECUTIVE SUMMARY
Clear answer to the main question/topic.

### 2. KEY POINTS
The 3-5 most important insights from the discussion.

### 3. RECOMMENDATIONS
Recommended decisions and actions.

### 4. CONSIDERATIONS
Risks, opportunities, and factors to monitor.

### 5. ACTION PLAN
Concrete actions with suggested priorities and timeline.

### 6. NEXT STEPS
The first immediate actions to take.`;

    const reportPrompt = reportPromptByMethodology[methodology] || defaultReportPrompt;

    const finalReportMessages = [
      {
        role: "system",
        content: isItalian 
          ? `Sei un consulente strategico senior esperto nella sintesi di deliberazioni complesse in report esecutivi azionabili. 
Il tuo compito è produrre un deliverable professionale che possa essere presentato direttamente al management.
IMPORTANTE: Scrivi SEMPRE in italiano.`
          : `You are a senior strategic consultant expert in synthesizing complex deliberations into actionable executive reports.
Your task is to produce a professional deliverable that can be presented directly to management.
IMPORTANT: ALWAYS write in English.`,
      },
      {
        role: "user",
        content: `${reportPrompt}

---

## Topic della Deliberazione / Deliberation Topic
${session.topic}

${session.objective ? `## Obiettivo / Objective\n${session.objective}\n` : ""}

## Trascrizione Completa / Full Transcript

${transcriptSummary}

---

${isItalian ? "Genera il report completo seguendo ESATTAMENTE la struttura richiesta. Sii specifico, concreto e azionabile." : "Generate the complete report following EXACTLY the required structure. Be specific, concrete, and actionable."}`,
      },
    ];

    let finalReport = "";
    try {
      finalReport = await callLovableAI(finalReportMessages, { 
        max_tokens: 4096, 
        temperature: 0.4 
      } as Agent);
      console.log("Final report generated successfully");
    } catch (error) {
      console.error("Failed to generate final report:", error);
      finalReport = isItalian 
        ? "Errore nella generazione del report finale. Consulta la trascrizione per i dettagli della deliberazione."
        : "Error generating final report. Please consult the transcript for deliberation details.";
    }

    // Generate action items from the report
    const actionItemsMessages = [
      {
        role: "system",
        content: isItalian 
          ? "Estrai le azioni concrete dal report. Rispondi SOLO con un array JSON di stringhe."
          : "Extract concrete actions from the report. Reply ONLY with a JSON array of strings.",
      },
      {
        role: "user",
        content: `${isItalian ? "Estrai 3-7 azioni concrete e specifiche da questo report" : "Extract 3-7 concrete and specific actions from this report"}:\n\n${finalReport}\n\n${isItalian ? "Formato: [\"azione 1\", \"azione 2\", ...]" : "Format: [\"action 1\", \"action 2\", ...]"}`,
      },
    ];

    let actionItems: string[] = [];
    try {
      const actionItemsContent = await callLovableAI(actionItemsMessages, { 
        max_tokens: 1024, 
        temperature: 0.2 
      } as Agent);
      const match = actionItemsContent.match(/\[[\s\S]*\]/);
      if (match) actionItems = JSON.parse(match[0]);
    } catch (error) {
      console.log("Failed to extract action items:", error);
    }

    // Complete session with final report
    await supabase
      .from("sessions")
      .update({
        status: "completed",
        transcript,
        results: { 
          final_report: finalReport,
          methodology_used: methodology,
          generated_at: new Date().toISOString()
        },
        action_items: actionItems,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    console.log("Session completed with final report");

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
