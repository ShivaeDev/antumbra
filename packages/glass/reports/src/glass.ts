import type { reports } from "@antumbra/domain-reports/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";

export type ReportsGlass = Glass<readonly [typeof reports]>;
export type ReportsApi = ReportsGlass["api"];
