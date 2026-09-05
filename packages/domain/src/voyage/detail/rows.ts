import type { ReportRow } from "@antumbra/reports";
import type { RepoRow, VoyageSummaryRows } from "#voyage-rows.ts";

export interface VoyageDetailRows extends Omit<VoyageSummaryRows, "voyages"> {
	readonly reports: ReadonlyMap<string, ReportRow>;
	readonly repos: ReadonlyMap<string, RepoRow>;
}
