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
    const body = await req.json();
    
    let provider_type: string;
    let api_key: string;
    let endpoint: string | null = null;
    let model: string | null = null;

    // Support both modes: direct API key (for testing new keys) and provider_id (for existing providers)
    if (body.provider_id) {
      // Fetch decrypted provider from database
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: provider, error } = await supabase
        .from('provider_profiles_decrypted')
        .select('*')
        .eq('id', body.provider_id)
        .single();

      if (error || !provider) {
        throw new Error("Provider not found");
      }

      provider_type = provider.provider_type;
      api_key = provider.api_key;
      endpoint = provider.endpoint;
      model = provider.model;
    } else {
      // Direct API key testing (for new keys before saving)
      provider_type = body.provider_type;
      api_key = body.api_key;
      endpoint = body.endpoint;
      model = body.model;
    }

    console.log("Testing provider:", provider_type);

    let testUrl: string;
    let testBody: any;
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (provider_type === "openai") {
      testUrl = "https://api.openai.com/v1/chat/completions";
      headers["Authorization"] = `Bearer ${api_key}`;
      testBody = {
        model: model || "gpt-4o-mini",
        messages: [{ role: "user", content: "Say 'OK'" }],
        max_completion_tokens: 5,
      };
    } else if (provider_type === "anthropic") {
      testUrl = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = api_key;
      headers["anthropic-version"] = "2023-06-01";
      testBody = {
        model: model || "claude-haiku-4-5",
        messages: [{ role: "user", content: "Say 'OK'" }],
        max_tokens: 5,
      };
    } else if (provider_type === "perplexity") {
      testUrl = "https://api.perplexity.ai/chat/completions";
      headers["Authorization"] = `Bearer ${api_key}`;
      testBody = {
        model: model || "sonar",
        messages: [{ role: "user", content: "Say 'OK'" }],
        max_tokens: 5,
      };
    } else if (provider_type === "tavily") {
      testUrl = "https://api.tavily.com/search";
      testBody = {
        api_key: api_key,
        query: "test",
        max_results: 1,
      };
      // Tavily uses api_key in body, not header
      delete headers["Authorization"];
    } else if (provider_type === "custom" && endpoint) {
      testUrl = endpoint;
      headers["Authorization"] = `Bearer ${api_key}`;
      testBody = {
        model: model || "default",
        messages: [{ role: "user", content: "Say 'OK'" }],
        max_tokens: 5,
      };
    } else {
      throw new Error("Invalid provider configuration");
    }

    console.log("Testing URL:", testUrl);

    const response = await fetch(testUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(testBody),
    });

    console.log("Response status:", response.status);

    if (response.ok) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      const error = await response.text();
      console.error("API error:", error);
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
