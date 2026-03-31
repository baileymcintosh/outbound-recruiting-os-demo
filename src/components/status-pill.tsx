import clsx from "clsx";
import type { CampaignContactStatus } from "@/lib/types";

export function StatusPill({ status }: { status: CampaignContactStatus }) {
  return <span className={clsx("status-pill", status)}>{status.replace("_", " ")}</span>;
}
