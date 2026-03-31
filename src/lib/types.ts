export type Contact = {
  id: string;
  full_name: string;
  firm: string | null;
  group: string | null;
  role: string | null;
  location: string | null;
  school: string | null;
  email: string | null;
  email_confidence_score: number | null;
  linkedin_url: string | null;
  tags: string[] | null;
  created_at: string;
};

export type CampaignContactStatus = "pending" | "sent" | "replied" | "no_reply";
