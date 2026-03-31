"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Contact } from "@/lib/types";

type Props = {
  contacts: Contact[];
  total: number;
  filters: {
    q: string;
    firm: string;
    school: string;
    role: string;
  };
  options: {
    firms: string[];
    schools: string[];
    roles: string[];
  };
};

export function ContactSearch({ contacts, total, filters, options }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [days, setDays] = useState(5);
  const [working, startTransition] = useTransition();
  const router = useRouter();

  const selectedContacts = useMemo(
    () => contacts.filter((contact) => selected.includes(contact.id)),
    [contacts, selected],
  );

  function updateQuery(key: keyof Props["filters"], value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/search?${params.toString()}`);
  }

  async function createCampaign() {
    if (selected.length === 0) {
      return;
    }

    const fallbackName = `Campaign ${new Date().toLocaleDateString()}`;
    startTransition(async () => {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: campaignName || fallbackName,
          contactIds: selected,
          timeWindowDays: days,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        alert(payload?.error || "Unable to create campaign.");
        return;
      }

      const payload = await response.json();
      router.push(`/campaigns/${payload.campaignId}`);
      router.refresh();
    });
  }

  return (
    <div className="split">
      <section className="panel">
        <div className="card-body stack">
          <div className="filters">
            <div className="field">
              <label htmlFor="q">Keyword</label>
              <input
                id="q"
                className="input"
                defaultValue={filters.q}
                placeholder="Centerview Wharton analysts"
                onBlur={(event) => updateQuery("q", event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="firm">Firm</label>
              <select
                id="firm"
                className="select"
                defaultValue={filters.firm}
                onChange={(event) => updateQuery("firm", event.target.value)}
              >
                <option value="">All firms</option>
                {options.firms.map((firm) => (
                  <option key={firm} value={firm}>
                    {firm}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="school">School</label>
              <select
                id="school"
                className="select"
                defaultValue={filters.school}
                onChange={(event) => updateQuery("school", event.target.value)}
              >
                <option value="">All schools</option>
                {options.schools.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                className="select"
                defaultValue={filters.role}
                onChange={(event) => updateQuery("role", event.target.value)}
              >
                <option value="">All roles</option>
                {options.roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="muted">{total} contacts found. Select targets and convert them into a campaign.</p>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Name</th>
                <th>Firm</th>
                <th>Group</th>
                <th>Role</th>
                <th>School</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <input
                      className="checkbox"
                      type="checkbox"
                      checked={selected.includes(contact.id)}
                      onChange={(event) =>
                        setSelected((current) =>
                          event.target.checked
                            ? [...current, contact.id]
                            : current.filter((id) => id !== contact.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <strong>{contact.full_name}</strong>
                    <div className="muted">{contact.location || "Unknown location"}</div>
                  </td>
                  <td>{contact.firm || "—"}</td>
                  <td>{contact.group || "—"}</td>
                  <td>{contact.role || "—"}</td>
                  <td>{contact.school || "—"}</td>
                  <td>
                    <div>{contact.email || "—"}</div>
                    <div className="muted">
                      Confidence {contact.email_confidence_score?.toFixed(2) || "n/a"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contacts.length === 0 ? <div className="empty">No contacts match the current filters.</div> : null}
        </div>
      </section>

      <aside className="panel">
        <div className="card-body stack">
          <div>
            <div className="eyebrow">Selection</div>
            <div className="metric-value">{selected.length}</div>
            <p className="muted">Selected contacts ready for outreach.</p>
          </div>

          <div className="list">
            {selectedContacts.slice(0, 6).map((contact) => (
              <div className="mini-card" key={contact.id}>
                <strong>{contact.full_name}</strong>
                <div className="muted">
                  {[contact.firm, contact.group].filter(Boolean).join(" · ")}
                </div>
              </div>
            ))}
          </div>

          <div className="field">
            <label htmlFor="campaignName">Campaign name</label>
            <input
              id="campaignName"
              className="input"
              placeholder="Wharton IB target list"
              value={campaignName}
              onChange={(event) => setCampaignName(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="days">Time window (days)</label>
            <input
              id="days"
              className="input"
              type="number"
              min={1}
              max={14}
              value={days}
              onChange={(event) => setDays(Number(event.target.value) || 5)}
            />
          </div>

          <button className="button" onClick={createCampaign} disabled={selected.length === 0 || working}>
            {working ? "Creating..." : "Create campaign"}
          </button>
        </div>
      </aside>
    </div>
  );
}
