const state = {
  route: "search",
  contacts: [],
  filters: { q: "", firm: "", school: "", role: "" },
  selection: [],
  draftCampaignName: "",
  draftDays: 5,
  campaigns: [],
  gmailConnected: false,
  gmailEmail: null,
  activeCampaignId: null,
};

const app = document.querySelector("#app");
const navButtons = document.querySelectorAll("[data-route]");
const storageKey = "outbound-recruiting-os-demo-v1";

init();

async function init() {
  bindNav();
  const response = await fetch("./data/contacts.json");
  const payload = await response.json();
  state.contacts = payload.contacts;
  loadStoredState();
  syncHashRoute();
  window.addEventListener("hashchange", syncHashRoute);
}

function loadStoredState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    state.campaigns = saved.campaigns || [];
    state.gmailConnected = Boolean(saved.gmailConnected);
    state.gmailEmail = saved.gmailEmail || null;
  } catch {}
}

function persistState() {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      campaigns: state.campaigns,
      gmailConnected: state.gmailConnected,
      gmailEmail: state.gmailEmail,
    }),
  );
}

function bindNav() {
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.route;
      window.location.hash = route === "campaigns" ? "#campaigns" : `#${route}`;
    });
  });
}

function syncHashRoute() {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash.startsWith("campaign/")) {
    state.route = "campaign";
    state.activeCampaignId = hash.split("/")[1] || null;
  } else if (["search", "dashboard", "campaigns"].includes(hash)) {
    state.route = hash;
    state.activeCampaignId = null;
  } else {
    state.route = "search";
    state.activeCampaignId = null;
  }

  navButtons.forEach((button) => {
    const active =
      (state.route === "campaign" && button.dataset.route === "campaigns") || button.dataset.route === state.route;
    button.classList.toggle("active", active);
  });

  render();
}

function render() {
  if (state.route === "dashboard") renderDashboard();
  else if (state.route === "campaigns") renderCampaignIndex();
  else if (state.route === "campaign") renderCampaign();
  else renderSearch();
}

function getFilterOptions() {
  const uniq = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return {
    firms: uniq(state.contacts.map((contact) => contact.firm)),
    schools: uniq(state.contacts.map((contact) => contact.school)),
    roles: uniq(state.contacts.map((contact) => contact.role)),
  };
}

function getFilteredContacts() {
  const q = state.filters.q.trim().toLowerCase();
  return state.contacts.filter((contact) => {
    if (state.filters.firm && contact.firm !== state.filters.firm) return false;
    if (state.filters.school && contact.school !== state.filters.school) return false;
    if (state.filters.role && contact.role !== state.filters.role) return false;
    if (!q) return true;
    const haystack = [contact.full_name, contact.firm, contact.group, contact.role, contact.school]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function createSchedule(total, days) {
  const results = [];
  const now = new Date();
  const perDay = Math.max(1, Math.ceil(total / Math.max(1, days)));
  for (let i = 0; i < total; i += 1) {
    const offsetDay = Math.floor(i / perDay);
    const hour = i % 2 === 0 ? 8 + (i % 3) : 16 + (i % 2);
    const date = new Date(now);
    date.setDate(now.getDate() + offsetDay);
    date.setHours(hour, (13 * (i + 1)) % 60, 0, 0);
    results.push(date.toISOString());
  }
  return results;
}

function createCampaign() {
  if (!state.selection.length) return;
  const contacts = state.contacts.filter((contact) => state.selection.includes(contact.id));
  const timestamps = createSchedule(contacts.length, state.draftDays);
  const now = new Date().toISOString();
  const campaignId = crypto.randomUUID();

  state.campaigns.unshift({
    id: campaignId,
    name: state.draftCampaignName || `Campaign ${new Date().toLocaleDateString()}`,
    created_at: now,
    contacts: contacts.map((contact, index) => ({
      id: crypto.randomUUID(),
      contact_id: contact.id,
      status: "pending",
      last_contacted_at: null,
      follow_up_scheduled: false,
      contact,
      email: {
        id: crypto.randomUUID(),
        kind: "initial",
        subject: `${contact.school || "Penn"} student reaching out`,
        body: `Hi ${contact.full_name}, I’m a student at ${contact.school || "Penn"} interested in ${[contact.firm, contact.group].filter(Boolean).join("/") || "your team"}. I’d love to learn more about your experience. Would you have 15 minutes to chat?`,
        scheduled_send_time: timestamps[index],
        sent_at: null,
        status: "scheduled",
      },
      follow_up: null,
    })),
  });

  state.selection = [];
  state.draftCampaignName = "";
  persistState();
  window.location.hash = `#campaign/${campaignId}`;
}

function connectSender() {
  state.gmailConnected = true;
  state.gmailEmail = "demo-sender@outboundrecruitingos.com";
  persistState();
  render();
}

function runSendQueue(campaignId) {
  const campaign = state.campaigns.find((item) => item.id === campaignId);
  if (!campaign) return;
  campaign.contacts.forEach((row) => {
    [row.email, row.follow_up].filter(Boolean).forEach((message) => {
      if (message.status === "scheduled") {
        message.status = "sent";
        message.sent_at = new Date().toISOString();
        row.status = "sent";
        row.last_contacted_at = message.sent_at;
      }
    });
  });
  persistState();
  render();
}

function scheduleFollowUps(campaignId) {
  const campaign = state.campaigns.find((item) => item.id === campaignId);
  if (!campaign) return;
  campaign.contacts.forEach((row) => {
    if (row.status === "sent" && !row.follow_up_scheduled) {
      row.follow_up = {
        id: crypto.randomUUID(),
        kind: "follow_up",
        subject: "Following up",
        body: `Hi ${row.contact.full_name}, just wanted to follow up in case this got buried. Would really appreciate a quick chat if you’re available.`,
        scheduled_send_time: new Date().toISOString(),
        sent_at: null,
        status: "scheduled",
      };
      row.follow_up_scheduled = true;
    }
  });
  persistState();
  render();
}

function markContact(campaignId, contactId, status) {
  const campaign = state.campaigns.find((item) => item.id === campaignId);
  if (!campaign) return;
  const row = campaign.contacts.find((item) => item.contact_id === contactId);
  if (!row) return;
  row.status = status;
  persistState();
  render();
}

function metric(label, value) {
  return `<article class="metric-card"><div class="metric-label">${label}</div><div class="metric-value">${value}</div></article>`;
}

function renderSearch() {
  const options = getFilterOptions();
  const contacts = getFilteredContacts();
  const selected = contacts.filter((contact) => state.selection.includes(contact.id));

  app.innerHTML = `
    <section class="hero panel">
      <div class="stack">
        <div>
          <div class="eyebrow">Search</div>
          <h2 class="section-title">Fast list building for targeted outreach</h2>
        </div>
        <p class="section-copy">This public demo uses anonymized contacts derived from the networking tracker. Search by firm, group, role, or school and build a campaign from the browser.</p>
      </div>
      <div class="stats-grid">
        ${metric("Visible results", contacts.length)}
        ${metric("Data source", "Anonymized")}
      </div>
    </section>
    <section class="split">
      <section class="panel">
        <div class="card-body stack">
          <div class="filters">
            <div class="field"><label for="q">Keyword</label><input id="q" class="input" value="${escapeHtml(state.filters.q)}" placeholder="Centerview Wharton analysts" /></div>
            <div class="field"><label for="firm">Firm</label><select id="firm" class="select">${buildOptions("All firms", options.firms, state.filters.firm)}</select></div>
            <div class="field"><label for="school">School</label><select id="school" class="select">${buildOptions("All schools", options.schools, state.filters.school)}</select></div>
            <div class="field"><label for="role">Role</label><select id="role" class="select">${buildOptions("All roles", options.roles, state.filters.role)}</select></div>
          </div>
          <p class="muted">${contacts.length} contacts found. Bulk export is intentionally disabled.</p>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Select</th><th>Name</th><th>Firm</th><th>Group</th><th>Role</th><th>School</th><th>Email</th></tr></thead>
            <tbody>
              ${contacts.map((contact) => `
                <tr>
                  <td><input type="checkbox" data-select="${contact.id}" ${state.selection.includes(contact.id) ? "checked" : ""} /></td>
                  <td><strong>${escapeHtml(contact.full_name)}</strong></td>
                  <td>${escapeHtml(contact.firm || "—")}</td>
                  <td>${escapeHtml(contact.group || "—")}</td>
                  <td>${escapeHtml(contact.role || "—")}</td>
                  <td>${escapeHtml(contact.school || "—")}</td>
                  <td>${escapeHtml(contact.email || "—")}</td>
                </tr>`).join("")}
            </tbody>
          </table>
          ${contacts.length ? "" : `<div class="empty">No contacts match the current filters.</div>`}
        </div>
      </section>
      <aside class="panel">
        <div class="card-body stack">
          <div><div class="eyebrow">Selection</div><div class="metric-value">${state.selection.length}</div><p class="muted">Selected contacts ready for outreach.</p></div>
          <div class="list">
            ${selected.slice(0, 6).map((contact) => `<div class="mini-card"><strong>${escapeHtml(contact.full_name)}</strong><div class="muted">${escapeHtml([contact.firm, contact.group].filter(Boolean).join(" · ") || "No group information")}</div></div>`).join("") || '<div class="empty">No contacts selected yet.</div>'}
          </div>
          <div class="field"><label for="campaign-name">Campaign name</label><input id="campaign-name" class="input" value="${escapeHtml(state.draftCampaignName)}" placeholder="Wharton IB target list" /></div>
          <div class="field"><label for="campaign-days">Time window (days)</label><input id="campaign-days" class="input" type="number" min="1" max="14" value="${state.draftDays}" /></div>
          <button class="button" id="create-campaign" ${state.selection.length ? "" : "disabled"}>Create campaign</button>
          <div class="note">For the public demo, the queue runner sends all scheduled emails immediately so reviewers can see the workflow in one pass.</div>
        </div>
      </aside>
    </section>
  `;

  document.querySelector("#q").addEventListener("input", (event) => { state.filters.q = event.target.value; renderSearch(); });
  document.querySelector("#firm").addEventListener("change", (event) => { state.filters.firm = event.target.value; renderSearch(); });
  document.querySelector("#school").addEventListener("change", (event) => { state.filters.school = event.target.value; renderSearch(); });
  document.querySelector("#role").addEventListener("change", (event) => { state.filters.role = event.target.value; renderSearch(); });
  document.querySelectorAll("[data-select]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) state.selection.push(input.dataset.select);
      else state.selection = state.selection.filter((id) => id !== input.dataset.select);
      renderSearch();
    });
  });
  document.querySelector("#campaign-name").addEventListener("input", (event) => { state.draftCampaignName = event.target.value; });
  document.querySelector("#campaign-days").addEventListener("input", (event) => { state.draftDays = Math.max(1, Number(event.target.value) || 5); });
  document.querySelector("#create-campaign").addEventListener("click", createCampaign);
}

function renderDashboard() {
  const messages = state.campaigns.flatMap((campaign) => campaign.contacts.flatMap((row) => [row.email, row.follow_up].filter(Boolean)));
  app.innerHTML = `
    <section class="stats-grid">
      ${metric("Campaigns", state.campaigns.length)}
      ${metric("Scheduled emails", messages.filter((email) => email.status === "scheduled").length)}
      ${metric("Sent emails", messages.filter((email) => email.status === "sent").length)}
    </section>
    <section class="grid-2" style="margin-top:20px;">
      <section class="panel">
        <div class="card-header"><div><div class="eyebrow">Sender</div><h2>Demo inbox connection</h2></div></div>
        <div class="card-body stack">
          <div class="panel" style="padding:16px 18px;">
            <strong>${state.gmailEmail || "Demo sender not connected"}</strong>
            <p class="muted">This public site simulates the Gmail connection step so viewers can test the workflow without touching a real inbox.</p>
            <button class="button" id="connect-sender" style="margin-top:12px;">${state.gmailConnected ? "Reconnect sender" : "Connect sender"}</button>
          </div>
        </div>
      </section>
      <section class="panel">
        <div class="card-header"><div><div class="eyebrow">Next step</div><h2>Run a live demo</h2></div></div>
        <div class="card-body stack">
          <p class="muted">Search the anonymized dataset, select a cohort, create a campaign, then simulate sends and follow-ups from the campaign view.</p>
          <button class="button-secondary" id="go-search">Open search</button>
        </div>
      </section>
    </section>
  `;

  document.querySelector("#connect-sender").addEventListener("click", connectSender);
  document.querySelector("#go-search").addEventListener("click", () => { window.location.hash = "#search"; });
}

function renderCampaignIndex() {
  app.innerHTML = `
    <section class="panel">
      <div class="card-header"><div><div class="eyebrow">Campaigns</div><h2>Saved outreach runs</h2></div></div>
      <div class="card-body list">
        ${state.campaigns.length ? state.campaigns.map((campaign) => `
          <div class="mini-card">
            <div class="inline" style="justify-content:space-between;">
              <div><strong>${escapeHtml(campaign.name)}</strong><div class="muted">${campaign.contacts.length} contacts · created ${new Date(campaign.created_at).toLocaleString()}</div></div>
              <button class="button-secondary" data-open-campaign="${campaign.id}">Open</button>
            </div>
          </div>`).join("") : '<div class="empty">No campaigns yet. Create one from the search view.</div>'}
      </div>
    </section>
  `;
  document.querySelectorAll("[data-open-campaign]").forEach((button) => {
    button.addEventListener("click", () => { window.location.hash = `#campaign/${button.dataset.openCampaign}`; });
  });
}

function renderCampaign() {
  const campaign = state.campaigns.find((item) => item.id === state.activeCampaignId);
  if (!campaign) return renderCampaignIndex();

  const counts = campaign.contacts.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const emails = campaign.contacts.flatMap((row) => [row.email, row.follow_up].filter(Boolean));

  app.innerHTML = `
    <section class="stats-grid">
      ${metric("Pending", counts.pending || 0)}
      ${metric("Sent", counts.sent || 0)}
      ${metric("Replied", counts.replied || 0)}
      ${metric("No reply", counts.no_reply || 0)}
    </section>
    <section class="grid-2" style="margin-top:20px;">
      <section class="panel">
        <div class="card-header"><div><div class="eyebrow">Campaign</div><h2>${escapeHtml(campaign.name)}</h2></div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Firm</th><th>Status</th><th>Last contacted</th><th>Actions</th></tr></thead>
            <tbody>
              ${campaign.contacts.map((row) => `
                <tr>
                  <td>${escapeHtml(row.contact.full_name)}</td>
                  <td>${escapeHtml(row.contact.firm || "—")}</td>
                  <td><span class="status ${row.status}">${row.status.replace("_", " ")}</span></td>
                  <td>${row.last_contacted_at ? new Date(row.last_contacted_at).toLocaleString() : "—"}</td>
                  <td class="inline"><button class="button-ghost" data-mark="${row.contact_id}|replied">Replied</button><button class="button-ghost" data-mark="${row.contact_id}|no_reply">No reply</button></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </section>
      <section class="panel">
        <div class="card-header"><div><div class="eyebrow">Actions</div><h2>Queue and follow-up</h2></div></div>
        <div class="card-body stack">
          <button class="button" id="send-queue">Run send queue</button>
          <button class="button-secondary" id="follow-up">Schedule follow-ups</button>
          <div class="note">The public demo immediately sends all scheduled emails when you click the queue button so reviewers can see the full workflow.</div>
        </div>
      </section>
    </section>
    <section class="panel" style="margin-top:20px;">
      <div class="card-header"><div><div class="eyebrow">Email queue</div><h2>Message preview</h2></div></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Kind</th><th>Subject</th><th>Scheduled</th><th>Status</th><th>Sent at</th></tr></thead>
          <tbody>
            ${emails.map((email) => `<tr><td>${email.kind}</td><td>${escapeHtml(email.subject)}</td><td>${new Date(email.scheduled_send_time).toLocaleString()}</td><td>${email.status}</td><td>${email.sent_at ? new Date(email.sent_at).toLocaleString() : "—"}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;

  document.querySelector("#send-queue").addEventListener("click", () => runSendQueue(campaign.id));
  document.querySelector("#follow-up").addEventListener("click", () => scheduleFollowUps(campaign.id));
  document.querySelectorAll("[data-mark]").forEach((button) => {
    button.addEventListener("click", () => {
      const [contactId, status] = button.dataset.mark.split("|");
      markContact(campaign.id, contactId, status);
    });
  });
}

function buildOptions(label, items, selected) {
  return [`<option value="">${label}</option>`, ...items.map((item) => `<option value="${escapeHtml(item)}" ${selected === item ? "selected" : ""}>${escapeHtml(item)}</option>`)].join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
