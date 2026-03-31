import type { Contact } from "@/lib/types";

type TemplateContact = Pick<Contact, "full_name" | "firm" | "group" | "school">;

export const defaultInitialTemplate =
  "Hi [Name], I’m a student at [School] interested in [Firm/Group]. I’d love to learn more about your experience. Would you have 15 minutes to chat?";

export const defaultFollowUpTemplate =
  "Hi [Name], just wanted to follow up in case this got buried. Would really appreciate a quick chat if you’re available.";

function replaceFirmGroup(contact: TemplateContact) {
  if (contact.firm && contact.group) {
    return `${contact.firm}/${contact.group}`;
  }
  return contact.firm || contact.group || "your team";
}

export function renderTemplate(template: string, contact: TemplateContact) {
  return template
    .replaceAll("[Name]", contact.full_name.split(" ")[0] || contact.full_name)
    .replaceAll("[School]", contact.school || "Penn")
    .replaceAll("[Firm]", contact.firm || "your firm")
    .replaceAll("[Group]", contact.group || "your group")
    .replaceAll("[Firm/Group]", replaceFirmGroup(contact));
}

export function buildInitialEmail(contact: TemplateContact) {
  return {
    subject: `${contact.school || "Penn"} student reaching out`,
    body: renderTemplate(defaultInitialTemplate, contact),
  };
}

export function buildFollowUpEmail(contact: TemplateContact) {
  return {
    subject: "Following up",
    body: renderTemplate(defaultFollowUpTemplate, contact),
  };
}
