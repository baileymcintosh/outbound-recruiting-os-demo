import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { getDemoDashboard } from "@/lib/demo-store";
import { hasEnv } from "@/lib/env";

export default async function DashboardPage() {
  const { user, supabase } = await requireUser();

  if (isDemoMode()) {
    const dashboard = await getDemoDashboard();

    return (
      <AppShell
        title="Outbound at a glance"
        copy="Demo mode is fully website-testable using your Excel workbook as the contact database."
        activePath="/dashboard"
      >
        <div className="stats-grid">
          <div className="stat panel">
            <div className="metric-label">Campaigns</div>
            <div className="stat-value">{dashboard.campaignCount}</div>
          </div>
          <div className="stat panel">
            <div className="metric-label">Scheduled emails</div>
            <div className="stat-value">{dashboard.scheduledCount}</div>
          </div>
          <div className="stat panel">
            <div className="metric-label">Sent emails</div>
            <div className="stat-value">{dashboard.sentCount}</div>
          </div>
        </div>

        <div className="grid-2" style={{ marginTop: 20 }}>
          <section className="panel">
            <div className="card-header">
              <div>
                <div className="eyebrow">Email mode</div>
                <h2>Demo sending</h2>
              </div>
            </div>
            <div className="card-body stack">
              <div className={`banner ${dashboard.gmailConnected ? "success" : "warn"}`}>
                <div>
                  <strong>{dashboard.gmailEmail || "Demo sender not connected yet"}</strong>
                  <p className="muted">
                    In demo mode, sender connection is simulated so you can test the full website flow.
                  </p>
                </div>
                <Link className="button" href="/api/gmail/connect">
                  {dashboard.gmailConnected ? "Reconnect demo sender" : "Connect demo sender"}
                </Link>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="card-header">
              <div>
                <div className="eyebrow">Next step</div>
                <h2>Launch a list</h2>
              </div>
            </div>
            <div className="card-body stack">
              <p className="muted">
                Search the workbook, select 10 to 20 contacts, create the campaign, and use the campaign page
                to run the send queue and follow-up automation.
              </p>
              <Link className="button" href="/search">
                Open search
              </Link>
            </div>
          </section>
        </div>
      </AppShell>
    );
  }

  const [{ count: campaignCount }, { count: scheduledCount }, { count: sentCount }, { data: gmailAccount }] =
    await Promise.all([
      supabase!.from("campaigns").select("*", { head: true, count: "exact" }).eq("user_id", user.id),
      supabase!
        .from("emails")
        .select("*", { head: true, count: "exact" })
        .eq("user_id", user.id)
        .eq("status", "scheduled"),
      supabase!
        .from("emails")
        .select("*", { head: true, count: "exact" })
        .eq("user_id", user.id)
        .eq("status", "sent"),
      supabase!.from("gmail_accounts").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

  const envReady =
    hasEnv("NEXT_PUBLIC_SUPABASE_URL") &&
    hasEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
    hasEnv("SUPABASE_SERVICE_ROLE_KEY") &&
    hasEnv("GOOGLE_CLIENT_ID") &&
    hasEnv("GOOGLE_CLIENT_SECRET");

  return (
    <AppShell
      title="Outbound at a glance"
      copy="Keep the product narrow: search targets, schedule outreach, and monitor send state."
      activePath="/dashboard"
    >
      <div className="stats-grid">
        <div className="stat panel">
          <div className="metric-label">Campaigns</div>
          <div className="stat-value">{campaignCount || 0}</div>
        </div>
        <div className="stat panel">
          <div className="metric-label">Scheduled emails</div>
          <div className="stat-value">{scheduledCount || 0}</div>
        </div>
        <div className="stat panel">
          <div className="metric-label">Sent emails</div>
          <div className="stat-value">{sentCount || 0}</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        <section className="panel">
          <div className="card-header">
            <div>
              <div className="eyebrow">Gmail</div>
              <h2>Sending account</h2>
            </div>
          </div>
          <div className="card-body stack">
            <div className={`banner ${gmailAccount?.email_address ? "success" : "warn"}`}>
              <div>
                <strong>{gmailAccount?.email_address || "No Gmail account connected"}</strong>
                <p className="muted">
                  Gmail must be connected before the queue worker can send scheduled emails.
                </p>
              </div>
              <Link className="button" href="/api/gmail/connect">
                {gmailAccount?.email_address ? "Reconnect Gmail" : "Connect Gmail"}
              </Link>
            </div>

            {!envReady ? (
              <div className="banner warn">
                Missing environment variables. Populate `.env.local` before testing auth and Gmail.
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <div className="card-header">
            <div>
              <div className="eyebrow">Next step</div>
              <h2>Launch a list</h2>
            </div>
          </div>
          <div className="card-body stack">
            <p className="muted">
              Search for a focused alumni segment like &quot;Centerview Wharton analysts&quot;, select 10 to 20 people,
              create the campaign, then run the queue worker.
            </p>
            <Link className="button" href="/search">
              Open search
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
