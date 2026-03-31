import { NextResponse } from "next/server";
import { exchangeGoogleCode } from "@/lib/gmail";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  const { tokens, email } = await exchangeGoogleCode(code);
  const supabase = createSupabaseServiceClient();

  await supabase.from("gmail_accounts").upsert(
    {
      user_id: state,
      email_address: email,
      access_token: tokens.access_token || null,
      refresh_token: tokens.refresh_token || null,
      expiry_date: tokens.expiry_date || null,
      scope: tokens.scope || null,
    },
    { onConflict: "user_id" },
  );

  return NextResponse.redirect(`${origin}/dashboard`);
}
