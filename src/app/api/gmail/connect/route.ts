import { NextResponse } from "next/server";
import { buildGoogleConsentUrl } from "@/lib/gmail";
import { isDemoMode } from "@/lib/demo-mode";
import { setDemoGmailConnected } from "@/lib/demo-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (isDemoMode()) {
    await setDemoGmailConnected();
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = buildGoogleConsentUrl(user.id);
  return NextResponse.redirect(url);
}
