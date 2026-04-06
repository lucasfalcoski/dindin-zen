import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('x-cron-secret');
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || authHeader !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Get previous month
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStart = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-01`;
    const prevMonthEnd = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).getDate()).padStart(2, "0")}`;

    // Fetch all recurrent expenses from the previous month
    const { data: recurrentExpenses, error: fetchError } = await supabase
      .from("expenses")
      .select("*")
      .eq("recurrent", true)
      .gte("date", prevMonthStart)
      .lte("date", prevMonthEnd);

    if (fetchError) throw fetchError;

    if (!recurrentExpenses || recurrentExpenses.length === 0) {
      return new Response(
        JSON.stringify({ message: "No recurring expenses found", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let created = 0;
    let skipped = 0;

    for (const expense of recurrentExpenses) {
      // Calculate new date (same day, current month)
      const oldDate = new Date(expense.date);
      const newDay = Math.min(oldDate.getDate(), new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
      const newDate = `${currentMonth}-${String(newDay).padStart(2, "0")}`;

      // Check if already exists this month for same user + description + amount
      const { data: existing } = await supabase
        .from("expenses")
        .select("id")
        .eq("user_id", expense.user_id)
        .eq("description", expense.description)
        .eq("amount", expense.amount)
        .eq("recurrent", true)
        .gte("date", `${currentMonth}-01`)
        .lte("date", `${currentMonth}-31`)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      // Create new expense
      const { error: insertError } = await supabase.from("expenses").insert({
        user_id: expense.user_id,
        group_id: expense.group_id,
        description: expense.description,
        amount: expense.amount,
        date: newDate,
        recurrent: true,
        notes: expense.notes,
        payment_method: expense.payment_method,
        account_id: expense.account_id,
        credit_card_id: expense.credit_card_id,
      });

      if (insertError) {
        console.error(`Failed to create recurring expense: ${insertError.message}`);
      } else {
        created++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Done", created, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('process-recurring failed:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
