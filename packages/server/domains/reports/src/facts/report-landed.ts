import { fact } from "@antumbra/platform-feature/fact.ts";
import { ReportLandedPayload } from "@antumbra/platform-vocabulary/reports-event.ts";
export const reportLanded = fact("ReportLanded", ReportLandedPayload.fields);
