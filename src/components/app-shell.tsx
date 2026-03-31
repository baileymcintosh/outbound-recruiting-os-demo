import Link from "next/link";
import { isDemoMode } from "@/lib/demo-mode";
import { signOut } from "@/lib/server-actions";

export function AppShell({
  title,
  copy,
  activePath,
  children,
}: {
  title: string;
  copy: string;
  activePath: "/dashboard" | "/search";
  children: React.ReactNode;
}) {
  const demoMode = isDemoMode();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-kicker">Outbound Recruiting OS</span>
          <h1>{title}</h1>
          <p>{copy}</p>
        </div>

        <nav className="nav">
          <Link className={activePath === "/search" ? "active" : "button-secondary"} href="/search">
            Search
          </Link>
          <Link
            className={activePath === "/dashboard" ? "active" : "button-secondary"}
            href="/dashboard"
          >
            Dashboard
          </Link>
          {demoMode ? (
            <span className="button-ghost">Demo mode</span>
          ) : (
            <form action={signOut}>
              <button className="button-ghost" type="submit">
                Sign out
              </button>
            </form>
          )}
        </nav>
      </header>

      {children}
    </div>
  );
}
