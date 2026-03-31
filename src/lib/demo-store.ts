import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { buildSchedule } from "@/lib/scheduler";
import { buildFollowUpEmail, buildInitialEmail } from "@/lib/templates";
import type { Contact } from "@/lib/types";
import type { DemoCampaign, DemoCampaignContact, DemoCampaignContactRow, DemoEmail, DemoState } from "@/lib/demo-types";

const DEMO_USER_ID = "demo-user";
const dataDir = path.join(process.cwd(), ".data");
const statePath = path.join(dataDir, "demo-state.json");
const workbookPath = path.join(process.cwd(), "Networking Tracker.xlsx");

type WorkbookRow = {
  Name?: string | null;
  Company?: string | null;
  Position?: string | null;
  Group?: string | null;
  Email?: string | null;
  LinkedIn?: string | null;
};

let contactsCache: Contact[] | null = null;

async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true });
}

function readWorkbookContacts(sheetName: string, school: string) {
  const workbookBuffer = readFileSync(workbookPath);
  const workbook = XLSX.read(workbookBuffer, { type: "buffer" });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return [];
  }

  return XLSX.utils
    .sheet_to_json<WorkbookRow>(sheet, { defval: null })
    .filter((row) => row.Name && row.Company)
    .map((row, index) => ({
      id: `${sheetName.toLowerCase().replace(/\s+/g, "-")}-${index + 1}`,
      full_name: row.Name!.trim(),
      firm: row.Company?.trim() || null,
      group: row.Group?.trim() || null,
      role: row.Position?.trim() || null,
      location: null,
      school,
      email: row.Email?.trim() || null,
      email_confidence_score: row.Email ? 0.96 : 0.2,
      linkedin_url: row.LinkedIn?.trim() || null,
      tags: [sheetName.toLowerCase().replace(/\s+/g, "-")],
      created_at: new Date().toISOString(),
    }));
}

export async function getDemoContacts() {
  if (contactsCache) {
    return contactsCache;
  }

  contactsCache = [
    ...readWorkbookContacts("Professional Networking", "Wharton"),
    ...readWorkbookContacts("Casual Networking", "Penn"),
  ];

  return contactsCache;
}

async function defaultState(): Promise<DemoState> {
  return {
    gmailConnected: false,
    gmailEmail: null,
    campaigns: [],
    campaignContacts: [],
    emails: [],
  };
}

export async function readDemoState() {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(statePath, "utf8");
    return JSON.parse(raw) as DemoState;
  } catch {
    const state = await defaultState();
    await writeDemoState(state);
    return state;
  }
}

export async function writeDemoState(state: DemoState) {
  await ensureDataDir();
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

export async function searchDemoContacts(filters: {
  q?: string;
  firm?: string;
  school?: string;
  role?: string;
}) {
  const contacts = await getDemoContacts();
  const q = filters.q?.trim().toLowerCase() || "";

  return contacts.filter((contact) => {
    if (filters.firm && contact.firm !== filters.firm) return false;
    if (filters.school && contact.school !== filters.school) return false;
    if (filters.role && contact.role !== filters.role) return false;
    if (q) {
      const haystack = [contact.full_name, contact.firm, contact.group, contact.role]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    }
    return true;
  });
}

export async function getDemoFilterOptions() {
  const contacts = await getDemoContacts();
  const uniq = (values: Array<string | null>) => [...new Set(values.filter(Boolean) as string[])].sort();

  return {
    firms: uniq(contacts.map((contact) => contact.firm)),
    schools: uniq(contacts.map((contact) => contact.school)),
    roles: uniq(contacts.map((contact) => contact.role)),
  };
}

export async function createDemoCampaign(input: {
  name: string;
  contactIds: string[];
  timeWindowDays: number;
}) {
  const contacts = await getDemoContacts();
  const selected = contacts.filter((contact) => input.contactIds.includes(contact.id));
  const state = await readDemoState();
  const now = new Date().toISOString();
  const campaign: DemoCampaign = {
    id: crypto.randomUUID(),
    user_id: DEMO_USER_ID,
    name: input.name,
    created_at: now,
  };
  const campaignContacts: DemoCampaignContact[] = selected.map((contact) => ({
    id: crypto.randomUUID(),
    campaign_id: campaign.id,
    contact_id: contact.id,
    status: "pending",
    last_contacted_at: null,
    follow_up_scheduled: false,
    created_at: now,
  }));
  const schedule = buildSchedule(selected.length, input.timeWindowDays);
  const emails: DemoEmail[] = selected.map((contact, index) => {
    const campaignContact = campaignContacts.find((row) => row.contact_id === contact.id)!;
    const message = buildInitialEmail(contact);
    return {
      id: crypto.randomUUID(),
      user_id: DEMO_USER_ID,
      contact_id: contact.id,
      campaign_id: campaign.id,
      campaign_contact_id: campaignContact.id,
      kind: "initial",
      subject: message.subject,
      body: message.body,
      scheduled_send_time: schedule[index].toISOString(),
      sent_at: null,
      thread_id: null,
      status: "scheduled",
      created_at: now,
    };
  });

  state.campaigns.unshift(campaign);
  state.campaignContacts.push(...campaignContacts);
  state.emails.push(...emails);
  await writeDemoState(state);
  return campaign.id;
}

export async function getDemoDashboard() {
  const state = await readDemoState();
  return {
    campaignCount: state.campaigns.length,
    scheduledCount: state.emails.filter((email) => email.status === "scheduled").length,
    sentCount: state.emails.filter((email) => email.status === "sent").length,
    gmailConnected: state.gmailConnected,
    gmailEmail: state.gmailEmail,
  };
}

export async function setDemoGmailConnected() {
  const state = await readDemoState();
  state.gmailConnected = true;
  state.gmailEmail = "demo@gmail.local";
  await writeDemoState(state);
}

export async function getDemoCampaign(id: string) {
  const state = await readDemoState();
  const contacts = await getDemoContacts();
  const campaign = state.campaigns.find((item) => item.id === id) || null;
  if (!campaign) return null;

  const campaignContacts: DemoCampaignContactRow[] = state.campaignContacts
    .filter((row) => row.campaign_id === id)
    .map((row) => ({
      ...row,
      contact: contacts.find((contact) => contact.id === row.contact_id)!,
    }));

  const emails = state.emails
    .filter((email) => email.campaign_id === id)
    .sort((a, b) => a.scheduled_send_time.localeCompare(b.scheduled_send_time));

  return { campaign, campaignContacts, emails };
}

export async function updateDemoCampaignContactStatus(
  campaignId: string,
  contactId: string,
  status: "replied" | "no_reply",
) {
  const state = await readDemoState();
  const row = state.campaignContacts.find(
    (item) => item.campaign_id === campaignId && item.contact_id === contactId,
  );
  if (!row) return false;
  row.status = status;
  await writeDemoState(state);
  return true;
}

export async function runDemoSendQueue(campaignId?: string) {
  const state = await readDemoState();
  const now = new Date().toISOString();
  const due = state.emails.filter((email) => {
    if (email.status !== "scheduled") return false;
    if (campaignId && email.campaign_id !== campaignId) return false;
    return email.scheduled_send_time <= now;
  });

  for (const email of due) {
    email.status = "sent";
    email.sent_at = new Date().toISOString();
    email.thread_id = email.thread_id || `demo-thread-${email.id.slice(0, 8)}`;
    const row = state.campaignContacts.find((item) => item.id === email.campaign_contact_id);
    if (row) {
      row.status = "sent";
      row.last_contacted_at = email.sent_at;
    }
  }

  await writeDemoState(state);
  return { processed: due.length };
}

export async function runDemoFollowUp(campaignId?: string) {
  const state = await readDemoState();
  const contacts = await getDemoContacts();
  const threshold = Date.now() - 5 * 24 * 60 * 60 * 1000;
  const created: DemoEmail[] = [];

  for (const row of state.campaignContacts) {
    if (campaignId && row.campaign_id !== campaignId) continue;
    if (row.status !== "sent" || row.follow_up_scheduled || !row.last_contacted_at) continue;
    if (new Date(row.last_contacted_at).getTime() > threshold) continue;

    const contact = contacts.find((item) => item.id === row.contact_id);
    if (!contact) continue;
    const initial = state.emails.find(
      (email) => email.campaign_contact_id === row.id && email.kind === "initial",
    );
    const message = buildFollowUpEmail(contact);

    created.push({
      id: crypto.randomUUID(),
      user_id: DEMO_USER_ID,
      contact_id: row.contact_id,
      campaign_id: row.campaign_id,
      campaign_contact_id: row.id,
      kind: "follow_up",
      subject: message.subject,
      body: message.body,
      scheduled_send_time: new Date().toISOString(),
      sent_at: null,
      thread_id: initial?.thread_id || null,
      status: "scheduled",
      created_at: new Date().toISOString(),
    });

    row.follow_up_scheduled = true;
  }

  state.emails.push(...created);
  await writeDemoState(state);
  return { scheduled: created.length };
}
