import { row } from "@antumbra/platform-feature/row.ts";
import { Report } from "@antumbra/platform-vocabulary/reports.ts";
export const report = row("report", Report.fields, { key: "id" });
