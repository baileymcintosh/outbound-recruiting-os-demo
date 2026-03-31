import type { Contact, CampaignContactStatus } from "@/lib/types";

export type DemoCampaign = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type DemoCampaignContact = {
  id: string;
  campaign_id: string;
  contact_id: string;
  status: CampaignContactStatus;
  last_contacted_at: string | null;
  follow_up_scheduled: boolean;
  created_at: string;
};

export type DemoEmail = {
  id: string;
  user_id: string;
  contact_id: string;
  campaign_id: string;
  campaign_contact_id: string | null;
  kind: "initial" | "follow_up";
  subject: string;
  body: string;
  scheduled_send_time: string;
  sent_at: string | null;
  thread_id: string | null;
  status: "scheduled" | "sent" | "failed" | "cancelled";
  created_at: string;
};

export type DemoState = {
  gmailConnected: boolean;
  gmailEmail: string | null;
  campaigns: DemoCampaign[];
  campaignContacts: DemoCampaignContact[];
  emails: DemoEmail[];
};

export type DemoCampaignContactRow = DemoCampaignContact & {
  contact: Contact;
};
