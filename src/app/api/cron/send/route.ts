import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { runDemoSendQueue } from "@/lib/demo-store";
import { sendGmailMessage } from "@/lib/gmail";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DueEmail = {
  id: string;
  user_id: string;
  campaign_contact_id: string | null;
  subject: string;
  body: string;
  thread_id: string | null;
  contacts: { email: string | null } | Array<{ email: string | null }> | null;
};

async function handleSend(body?: { campaignId?: string }) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("emails")
    .select("*, contacts(*)")
    .eq("status", "scheduled")
    .lte("scheduled_send_time", new Date().toISOString())
    .order("scheduled_send_time", { ascending: true })
    .limit(25);

  if (body?.campaignId) {
    query = query.eq("campaign_id", body.campaignId);
  }

  const { data: emails, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];

  for (const email of (emails || []) as DueEmail[]) {
    const contact = Array.isArray(email.contacts) ? email.contacts[0] : email.contacts;

    const { data: gmailAccount } = await supabase
      .from("gmail_accounts")
      .select("*")
      .eq("user_id", email.user_id)
      .maybeSingle();

    if (!contact?.email || !gmailAccount) {
      continue;
    }

    try {
      const result = await sendGmailMessage({
        accessToken: gmailAccount.access_token,
        refreshToken: gmailAccount.refresh_token,
        expiryDate: gmailAccount.expiry_date,
        to: contact.email,
        subject: email.subject,
        body: email.body,
        threadId: email.thread_id,
      });

      await supabase
        .from("emails")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          thread_id: result.threadId,
        })
        .eq("id", email.id);

      if (email.campaign_contact_id) {
        await supabase
          .from("campaign_contacts")
          .update({
            status: "sent",
            last_contacted_at: new Date().toISOString(),
          })
          .eq("id", email.campaign_contact_id);
      }

      await supabase
        .from("gmail_accounts")
        .update({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          expiry_date: result.expiryDate,
        })
        .eq("id", gmailAccount.id);

      results.push({ id: email.id, status: "sent" });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : "Unknown send error";
      await supabase.from("emails").update({ status: "failed" }).eq("id", email.id);
      results.push({ id: email.id, status: "failed", error: message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

export async function GET(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json(await runDemoSendQueue());
  }

  const authorization = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (expected && authorization !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return handleSend();
}

export async function POST(request: Request) {
  if (isDemoMode()) {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(await runDemoSendQueue(body.campaignId));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  return handleSend(body);
}
