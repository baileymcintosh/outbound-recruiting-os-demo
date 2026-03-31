import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CampaignActions } from "@/components/campaign-actions";
import { StatusPill } from "@/components/status-pill";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { getDemoCampaign } from "@/lib/demo-store";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, supabase } = await requireUser();
  const { id } = await params;

  if (isDemoMode()) {
    const payload = await getDemoCampaign(id);
    if (!payload) {
      notFound();
    }

    const { campaign, campaignContacts, emails } = payload;
    const statusCounts = campaignContacts.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    }, {});

    return (
      <AppShell
        title={campaign.name}
        copy="Review queued emails, current statuses, and follow-up scheduling for this campaign."
        activePath="/dashboard"
      >
        <div className="stats-grid">
          <div className="stat panel">
            <div className="metric-label">Pending</div>
            <div className="stat-value">{statusCounts.pending || 0}</div>
          </div>
          <div className="stat panel">
            <div className="metric-label">Sent</div>
            <div className="stat-value">{statusCounts.sent || 0}</div>
          </div>
          <div className="stat panel">
            <div className="metric-label">Replied</div>
            <div className="stat-value">{statusCounts.replied || 0}</div>
          </div>
          <div className="stat panel">
            <div className="metric-label">No reply</div>
            <div className="stat-value">{statusCounts.no_reply || 0}</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 20 }}>
          <section className="panel">
            <div className="card-header">
              <div>
                <div className="eyebrow">Campaign contacts</div>
                <h2>Target status</h2>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Firm</th>
                    <th>Status</th>
                    <th>Last contacted</th>
                    <th>Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignContacts.map((row) => (
                    <tr key={row.id}>
                      <td>{row.contact.full_name}</td>
                      <td>{row.contact.firm || "—"}</td>
                      <td>
                        <StatusPill status={row.status} />
                      </td>
                      <td>{row.last_contacted_at ? new Date(row.last_contacted_at).toLocaleString() : "—"}</td>
                      <td>{row.follow_up_scheduled ? "Scheduled" : "Not yet"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="card-header">
              <div>
                <div className="eyebrow">Actions</div>
                <h2>Queue + manual tracking</h2>
              </div>
            </div>
            <div className="card-body">
              <CampaignActions
                campaignId={campaign.id}
                contactIds={campaignContacts.map((row) => row.contact_id)}
              />
            </div>
          </section>
        </div>

        <section className="panel" style={{ marginTop: 20 }}>
          <div className="card-header">
            <div>
              <div className="eyebrow">Email queue</div>
              <h2>Scheduled messages</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Kind</th>
                  <th>Subject</th>
                  <th>Scheduled</th>
                  <th>Status</th>
                  <th>Sent at</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <tr key={email.id}>
                    <td>{email.kind}</td>
                    <td>{email.subject}</td>
                    <td>{new Date(email.scheduled_send_time).toLocaleString()}</td>
                    <td>{email.status}</td>
                    <td>{email.sent_at ? new Date(email.sent_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </AppShell>
    );
  }

  const { data: campaign } = await supabase!
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!campaign) {
    notFound();
  }

  const [{ data: campaignContacts }, { data: emailRecords }] = await Promise.all([
    supabase!
      .from("campaign_contacts")
      .select("id, contact_id, status, follow_up_scheduled, last_contacted_at, contacts(*)")
      .eq("campaign_id", id)
      .order("last_contacted_at", { ascending: true, nullsFirst: true }),
    supabase!
      .from("emails")
      .select("*")
      .eq("campaign_id", id)
      .order("scheduled_send_time", { ascending: true }),
  ]);

  const statusCounts = (campaignContacts || []).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <AppShell
      title={campaign.name}
      copy="Review queued emails, current statuses, and follow-up scheduling for this campaign."
      activePath="/dashboard"
    >
      <div className="stats-grid">
        <div className="stat panel">
          <div className="metric-label">Pending</div>
          <div className="stat-value">{statusCounts.pending || 0}</div>
        </div>
        <div className="stat panel">
          <div className="metric-label">Sent</div>
          <div className="stat-value">{statusCounts.sent || 0}</div>
        </div>
        <div className="stat panel">
          <div className="metric-label">Replied</div>
          <div className="stat-value">{statusCounts.replied || 0}</div>
        </div>
        <div className="stat panel">
          <div className="metric-label">No reply</div>
          <div className="stat-value">{statusCounts.no_reply || 0}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        <section className="panel">
          <div className="card-header">
            <div>
              <div className="eyebrow">Campaign contacts</div>
              <h2>Target status</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Firm</th>
                  <th>Status</th>
                  <th>Last contacted</th>
                  <th>Follow-up</th>
                </tr>
              </thead>
              <tbody>
                {(campaignContacts || []).map((row) => {
                  const contact = Array.isArray(row.contacts) ? row.contacts[0] : row.contacts;
                  return (
                    <tr key={row.id}>
                      <td>{contact?.full_name || "Unknown"}</td>
                      <td>{contact?.firm || "—"}</td>
                      <td>
                        <StatusPill status={row.status} />
                      </td>
                      <td>{row.last_contacted_at ? new Date(row.last_contacted_at).toLocaleString() : "—"}</td>
                      <td>{row.follow_up_scheduled ? "Scheduled" : "Not yet"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="card-header">
            <div>
              <div className="eyebrow">Actions</div>
              <h2>Queue + manual tracking</h2>
            </div>
          </div>
          <div className="card-body">
            <CampaignActions
              campaignId={campaign.id}
              contactIds={(campaignContacts || []).map((row) => row.contact_id)}
            />
          </div>
        </section>
      </div>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div>
            <div className="eyebrow">Email queue</div>
            <h2>Scheduled messages</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Kind</th>
                <th>Subject</th>
                <th>Scheduled</th>
                <th>Status</th>
                <th>Sent at</th>
              </tr>
            </thead>
            <tbody>
              {(emailRecords || []).map((email) => (
                <tr key={email.id}>
                  <td>{email.kind}</td>
                  <td>{email.subject}</td>
                  <td>{new Date(email.scheduled_send_time).toLocaleString()}</td>
                  <td>{email.status}</td>
                  <td>{email.sent_at ? new Date(email.sent_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
