import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DemoAccount {
  email: string;
  password: string;
  name: string;
  role: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "SUPER_ADMIN", email: "admin@dapur.id", password: "admin123", name: "Admin Utama" },
  { role: "AHLI_GIZI", email: "gizi@dapur.id", password: "gizi1234", name: "Ahli Gizi" },
  { role: "PEMBELI", email: "pembeli@dapur.id", password: "pembeli1", name: "Pembeli" },
  { role: "PENERIMA", email: "penerima@dapur.id", password: "penerima", name: "Penerima Barang" },
  { role: "CHEF", email: "chef@dapur.id", password: "chef1234", name: "Chef Dapur" },
  { role: "KEPALA_DAPUR", email: "kepala@dapur.id", password: "kepala12", name: "Kepala Dapur" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const results: { email: string; status: string; error?: string }[] = [];

    for (const account of DEMO_ACCOUNTS) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u) => u.email === account.email);

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
          results.push({ email: account.email, status: "exists" });
        } else {
          // Create user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: account.email,
            password: account.password,
            email_confirm: true,
            user_metadata: { name: account.name },
          });

          if (createError) {
            results.push({ email: account.email, status: "error", error: createError.message });
            continue;
          }

          userId = newUser.user.id;
          results.push({ email: account.email, status: "created" });
        }

        // Check if role exists
        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (!existingRole) {
          // Insert role
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: userId, role: account.role });

          if (roleError) {
            console.error(`Error adding role for ${account.email}:`, roleError);
          }
        }

        // Check if profile exists
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (!existingProfile) {
          // Insert profile
          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .insert({ 
              user_id: userId, 
              name: account.name, 
              email: account.email,
              is_active: true 
            });

          if (profileError) {
            console.error(`Error adding profile for ${account.email}:`, profileError);
          }
        }
      } catch (accountError) {
        results.push({ 
          email: account.email, 
          status: "error", 
          error: accountError instanceof Error ? accountError.message : "Unknown error" 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Demo accounts seeded",
        results 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
