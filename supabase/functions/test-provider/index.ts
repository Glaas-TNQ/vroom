import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider_type, api_key, endpoint, model } = await req.json();
    console.log("Testing provider:", provider_type);

    let testUrl: string;
    let testBody: any;

    if (provider_type === "openai") {
      testUrl = "https://api.openai.com/v1/chat/completions";
      testBody = {
        model: model || "gpt-4o-mini",
        messages: [{ role: "user", content: "Say 'OK'" }],
        max_tokens: 5,
      };
    } else if (provider_type === "anthropic") {
      testUrl = "https://api.anthropic.com/v1/messages";
      testBody = {
        model: model || "claude-3-5-haiku-20241022",
        messages: [{ role: "user", content: "Say 'OK'" }],
        max_tokens: 5,
      };
    } else if (provider_type === "custom" && endpoint) {
      testUrl = endpoint;
      testBody = {
        model: model || "default",
        messages: [{ role: "user", content: "Say 'OK'" }],
        max_tokens: 5,
      };
    } else {
      throw new Error("Invalid provider configuration");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (provider_type === "anthropic") {
      headers["x-api-key"] = api_key;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers["Authorization"] = `Bearer ${api_key}`;
    }

    const response = await fetch(testUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(testBody),
    });

    if (response.ok) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      const error = await response.text();
      return new Response(JSON.stringify({ success: false, error }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error: unknown) {
    console.error("Test error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
