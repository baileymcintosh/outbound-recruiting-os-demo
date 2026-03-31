import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { isDemoMode } from "@/lib/demo-mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  if (isDemoMode()) {
    redirect("/search");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/search");
  }

  return (
    <div className="auth-shell">
      <div className="auth-card panel">
        <section className="auth-hero">
          <div className="stack">
            <span className="brand-kicker">Penn / Wharton MVP</span>
            <h1>Send alumni outreach in minutes, not weekends.</h1>
            <p>
              Search a structured alumni dataset, select a target list, and push staggered Gmail outreach
              from one screen.
            </p>
          </div>

          <div className="auth-points">
            <div className="auth-point">
              <strong>Fast search</strong>
              <p>Keyword, firm, school, and role filters built for immediate list-building.</p>
            </div>
            <div className="auth-point">
              <strong>Campaign scheduling</strong>
              <p>Randomized sends across recruiting-safe windows with auto follow-up creation.</p>
            </div>
            <div className="auth-point">
              <strong>Gmail-native</strong>
              <p>Messages send from the student’s own inbox, not a detached outbound system.</p>
            </div>
          </div>
        </section>

        <section className="auth-form">
          <div className="stack">
            <div>
              <div className="eyebrow">Account access</div>
              <h2 className="section-title">Create or access your workspace</h2>
              <p className="section-copy">
                Use email/password for the app account. Connect Gmail after login to enable sending.
              </p>
            </div>
            <AuthForm />
          </div>
        </section>
      </div>
    </div>
  );
}
