"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function CampaignActions({
  campaignId,
  contactIds,
}: {
  campaignId: string;
  contactIds: string[];
}) {
  const [working, startTransition] = useTransition();
  const router = useRouter();

  function trigger(action: "queue" | "follow-up") {
    startTransition(async () => {
      const endpoint = action === "queue" ? "/api/cron/send" : "/api/cron/follow-up";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campaignId }),
      });

      if (!response.ok) {
        alert("Action failed.");
        return;
      }

      router.refresh();
    });
  }

  async function markStatus(contactId: string, status: "replied" | "no_reply") {
    startTransition(async () => {
      const response = await fetch(`/api/campaigns/${campaignId}/contacts/${contactId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        alert("Unable to update status.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <button className="button" onClick={() => trigger("queue")} disabled={working}>
          {working ? "Running..." : "Run send queue"}
        </button>
        <button className="button-secondary" onClick={() => trigger("follow-up")} disabled={working}>
          Schedule follow-ups
        </button>
      </div>

      <div className="list">
        {contactIds.slice(0, 8).map((contactId) => (
          <div className="mini-card toolbar" key={contactId}>
            <span className="code">{contactId.slice(0, 8)}</span>
            <div className="inline-form">
              <button className="button-ghost" onClick={() => markStatus(contactId, "replied")}>
                Mark replied
              </button>
              <button className="button-ghost" onClick={() => markStatus(contactId, "no_reply")}>
                Mark no reply
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
