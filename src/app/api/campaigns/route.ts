import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo-mode";
import { createDemoCampaign } from "@/lib/demo-store";
import { buildSchedule } from "@/lib/scheduler";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildInitialEmail } from "@/lib/templates";

export async function POST(request: Request) {
  if (isDemoMode()) {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const contactIds = Array.isArray(body.contactIds) ? body.contactIds : [];
    const timeWindowDays = Number(body.timeWindowDays) || 5;

    if (!name || contactIds.length === 0) {
      return NextResponse.json({ error: "Campaign name and contacts are required." }, { status: 400 });
    }

    const campaignId = await createDemoCampaign({ name, contactIds, timeWindowDays });
    return NextResponse.json({ campaignId });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = String(body.name || "").trim();
  const contactIds = Array.isArray(body.contactIds) ? body.contactIds : [];
  const timeWindowDays = Number(body.timeWindowDays) || 5;

  if (!name || contactIds.length === 0) {
    return NextResponse.json({ error: "Campaign name and contacts are required." }, { status: 400 });
  }

  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("*")
    .in("id", contactIds);

  if (contactsError || !contacts || contacts.length === 0) {
    return NextResponse.json({ error: "Contacts not found." }, { status: 400 });
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      name,
    })
    .select("*")
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Unable to create campaign." }, { status: 500 });
  }

  const { data: campaignContacts, error: campaignContactsError } = await supabase
    .from("campaign_contacts")
    .insert(
      contacts.map((contact) => ({
        campaign_id: campaign.id,
        contact_id: contact.id,
        status: "pending",
        follow_up_scheduled: false,
      })),
    )
    .select("*");

  if (campaignContactsError || !campaignContacts) {
    return NextResponse.json({ error: "Unable to create campaign contacts." }, { status: 500 });
  }

  const schedule = buildSchedule(contacts.length, timeWindowDays);
  const emailsToInsert = contacts.map((contact, index) => {
    const message = buildInitialEmail(contact);
    const campaignContact = campaignContacts.find((row) => row.contact_id === contact.id);

    return {
      user_id: user.id,
      contact_id: contact.id,
      campaign_id: campaign.id,
      campaign_contact_id: campaignContact?.id || null,
      kind: "initial",
      subject: message.subject,
      body: message.body,
      scheduled_send_time: schedule[index].toISOString(),
      status: "scheduled",
    };
  });

  const { error: emailsError } = await supabase.from("emails").insert(emailsToInsert);

  if (emailsError) {
    return NextResponse.json({ error: "Campaign created but emails failed to queue." }, { status: 500 });
  }

  return NextResponse.json({ campaignId: campaign.id });
}
