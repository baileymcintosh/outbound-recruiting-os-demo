import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { updateDemoCampaignContactStatus } from "@/lib/demo-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ campaignId: string; contactId: string }> },
) {
  const { campaignId, contactId } = await params;
  const { status } = await request.json();

  if (!["replied", "no_reply"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if (isDemoMode()) {
    const ok = await updateDemoCampaignContactStatus(campaignId, contactId, status);
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Unable to update status." }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { error } = await supabase
    .from("campaign_contacts")
    .update({ status })
    .eq("campaign_id", campaignId)
    .eq("contact_id", contactId);

  if (error) {
    return NextResponse.json({ error: "Unable to update status." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
