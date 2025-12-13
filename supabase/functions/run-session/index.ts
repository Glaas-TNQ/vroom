import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    console.log("Starting session:", sessionId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      throw new Error("Session not found");
    }

    // Get agents
    const agentIds = session.agent_config.map((a: any) => a.id);
    const { data: agents } = await supabase
      .from("agents")
      .select("*")
      .in("id", agentIds);

    if (!agents || agents.length === 0) {
      throw new Error("No agents found");
    }

    // Update status to running
    await supabase
      .from("sessions")
      .update({ status: "running" })
      .eq("id", sessionId);

    const transcript: any[] = [];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Run rounds
    for (let round = 1; round <= session.max_rounds; round++) {
      console.log(`Round ${round} of ${session.max_rounds}`);

      for (const agent of agents) {
        const context = transcript.slice(-10).map((m: any) => `${m.agent_name}: ${m.content}`).join("\n\n");
        
        const messages = [
          { role: "system", content: agent.system_prompt },
          {
            role: "user",
            content: `Topic: ${session.topic}\n${session.objective ? `Objective: ${session.objective}\n` : ""}\nRound ${round} of ${session.max_rounds}.\n\n${context ? `Previous discussion:\n${context}\n\n` : ""}Provide your perspective on this topic. Be concise (2-3 paragraphs max).`,
          },
        ];

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
          console.error("AI error:", await response.text());
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "No response";

        const message = {
          agent_id: agent.id,
          agent_name: agent.name,
          content,
          round,
          timestamp: new Date().toISOString(),
        };

        transcript.push(message);

        // Update transcript in DB
        await supabase
          .from("sessions")
          .update({ transcript, current_round: round })
          .eq("id", sessionId);
      }
    }

    // Generate action items
    const summaryMessages = [
      {
        role: "system",
        content: "You are an expert at synthesizing discussions into actionable items.",
      },
      {
        role: "user",
        content: `Based on this deliberation, extract 3-5 key action items:\n\nTopic: ${session.topic}\n\n${transcript.map((m) => `${m.agent_name}: ${m.content}`).join("\n\n")}\n\nReturn only a JSON array of strings, each being an action item.`,
      },
    ];

    const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: summaryMessages,
      }),
    });

    let actionItems: string[] = [];
    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      const text = summaryData.choices?.[0]?.message?.content || "[]";
      try {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) actionItems = JSON.parse(match[0]);
      } catch {
        console.log("Failed to parse action items");
      }
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
