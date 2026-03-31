import { AppShell } from "@/components/app-shell";
import { ContactSearch } from "@/components/contact-search";
import { requireUser } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo-mode";
import { getDemoFilterOptions, searchDemoContacts } from "@/lib/demo-store";

type SearchParams = Promise<{
  q?: string;
  firm?: string;
  school?: string;
  role?: string;
}>;

export default async function SearchPage(props: { searchParams: SearchParams }) {
  const { supabase } = await requireUser();
  const searchParams = await props.searchParams;
  const q = searchParams.q?.trim() || "";
  const firm = searchParams.firm?.trim() || "";
  const school = searchParams.school?.trim() || "";
  const role = searchParams.role?.trim() || "";

  if (isDemoMode()) {
    const [contacts, options] = await Promise.all([
      searchDemoContacts({ q, firm, school, role }),
      getDemoFilterOptions(),
    ]);

    return (
      <AppShell
        title="Search alumni and build campaigns"
        copy="Demo mode is reading your Networking Tracker workbook directly."
        activePath="/search"
      >
        <div className="hero panel">
          <div className="stack">
            <div>
              <div className="eyebrow">Search</div>
              <h2 className="section-title">Fast list building for targeted outreach</h2>
            </div>
            <p className="section-copy">
              This demo is powered by the Excel workbook in the repo. Search, select, create a campaign, and
              test the product from the website without external setup.
            </p>
          </div>

          <div className="metric-grid">
            <div className="metric">
              <div className="metric-label">Visible results</div>
              <div className="metric-value">{contacts.length}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Workbook source</div>
              <div className="metric-value">Excel</div>
            </div>
          </div>
        </div>

        <ContactSearch
          contacts={contacts}
          total={contacts.length}
          filters={{ q, firm, school, role }}
          options={options}
        />
      </AppShell>
    );
  }

  let query = supabase!.from("contacts").select("*", { count: "exact" }).order("full_name");

  if (firm) {
    query = query.eq("firm", firm);
  }
  if (school) {
    query = query.eq("school", school);
  }
  if (role) {
    query = query.eq("role", role);
  }
  if (q) {
    query = query.or(`full_name.ilike.%${q}%,firm.ilike.%${q}%,group.ilike.%${q}%`);
  }

  const [{ data: contacts, count }, { data: firms }, { data: schools }, { data: roles }] = await Promise.all([
    query.limit(150),
    supabase!.from("contacts").select("firm").not("firm", "is", null),
    supabase!.from("contacts").select("school").not("school", "is", null),
    supabase!.from("contacts").select("role").not("role", "is", null),
  ]);

  const normalize = (rows: Array<Record<string, string | null>> | null, key: string) =>
    [...new Set((rows || []).map((row) => row[key]).filter(Boolean) as string[])].sort();

  return (
    <AppShell
      title="Search alumni and build campaigns"
      copy="Filter the contact graph, select targets, and convert the list into scheduled outreach."
      activePath="/search"
    >
      <div className="hero panel">
        <div className="stack">
          <div>
            <div className="eyebrow">Search</div>
            <h2 className="section-title">Fast list building for targeted outreach</h2>
          </div>
          <p className="section-copy">
            The MVP is optimized for direct sourcing. There is no export, no pipeline clutter, and no extra
            workflow between finding contacts and launching a campaign.
          </p>
        </div>

        <div className="metric-grid">
          <div className="metric">
            <div className="metric-label">Visible results</div>
            <div className="metric-value">{count || 0}</div>
          </div>
          <div className="metric">
            <div className="metric-label">Search limit</div>
            <div className="metric-value">150</div>
          </div>
        </div>
      </div>

      <ContactSearch
        contacts={contacts || []}
        total={count || 0}
        filters={{ q, firm, school, role }}
        options={{
          firms: normalize(firms as Array<Record<string, string | null>>, "firm"),
          schools: normalize(schools as Array<Record<string, string | null>>, "school"),
          roles: normalize(roles as Array<Record<string, string | null>>, "role"),
        }}
      />
    </AppShell>
  );
}
