import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { descriptions, groups } = await req.json();

    if (!descriptions || !Array.isArray(descriptions) || !groups || !Array.isArray(groups)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groupNames = groups.map((g: any) => g.name).join(", ");
    const prompt = descriptions
      .map((d: string, i: number) => `${i + 1}. "${d}"`)
      .join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Você é um classificador de despesas. Os grupos disponíveis são: ${groupNames}. Para cada despesa, responda APENAS com o nome exato do grupo mais adequado. Se não tiver certeza, use "Outros".`,
          },
          {
            role: "user",
            content: `Classifique cada despesa no grupo correto. Responda em JSON array com os nomes dos grupos na mesma ordem:\n${prompt}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_expenses",
              description: "Classify expenses into groups",
              parameters: {
                type: "object",
                properties: {
                  classifications: {
                    type: "array",
                    items: { type: "string" },
                    description: "Group name for each expense, in order",
                  },
                },
                required: ["classifications"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_expenses" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI classification failed");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let classifications: string[] = [];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      classifications = parsed.classifications || [];
    }

    return new Response(JSON.stringify({ classifications }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
