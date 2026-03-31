import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { runDemoFollowUp } from "@/lib/demo-store";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildFollowUpEmail } from "@/lib/templates";

type RelatedEmail = {
  kind: string;
  thread_id: string | null;
};

type FollowUpRow = {
  id: string;
  contact_id: string;
  campaign_id: string;
  contacts:
    | {
        full_name: string;
        firm: string | null;
        group: string | null;
        school: string | null;
      }
    | Array<{
        full_name: string;
        firm: string | null;
        group: string | null;
        school: string | null;
      }>
    | null;
  campaigns:
    | {
        user_id: string;
      }
    | Array<{
        user_id: string;
      }>
    | null;
  emails: RelatedEmail[] | null;
};

async function handleFollowUp(body?: { campaignId?: string }) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("campaign_contacts")
    .select("*, contacts(*), campaigns(*), emails(*)")
    .eq("status", "sent")
    .eq("follow_up_scheduled", false)
    .lte("last_contacted_at", addDays(new Date(), -5).toISOString())
    .order("last_contacted_at", { ascending: true })
    .limit(50);

  if (body?.campaignId) {
    query = query.eq("campaign_id", body.campaignId);
  }

  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const inserts = ((rows || []) as FollowUpRow[])
    .map((row) => {
      const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
      const campaign = Array.isArray(row.campaigns) ? row.campaigns[0] : row.campaigns;
      const initialEmail = Array.isArray(row.emails)
        ? row.emails.find((email: RelatedEmail) => email.kind === "initial")
        : null;

      if (!contact || !campaign?.user_id) {
        return null;
      }

      const message = buildFollowUpEmail(contact);

      return {
        user_id: campaign.user_id,
        contact_id: row.contact_id,
        campaign_id: row.campaign_id,
        campaign_contact_id: row.id,
        kind: "follow_up",
        subject: message.subject,
        body: message.body,
        scheduled_send_time: addDays(new Date(), 1).toISOString(),
        thread_id: initialEmail?.thread_id || null,
        status: "scheduled",
      };
    })
    .filter(Boolean);

  if (inserts.length > 0) {
    await supabase.from("emails").insert(inserts);
    await supabase
      .from("campaign_contacts")
      .update({ follow_up_scheduled: true })
      .in(
        "id",
        (rows || []).map((row) => row.id),
      );
  }

  return NextResponse.json({ scheduled: inserts.length });
}

export async function GET(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json(await runDemoFollowUp());
  }

  const authorization = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (expected && authorization !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return handleFollowUp();
}

export async function POST(request: Request) {
  if (isDemoMode()) {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(await runDemoFollowUp(body.campaignId));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  return handleFollowUp(body);
}
