import { row } from "@antumbra/platform-feature/row.ts";
import { VoyageCaptainWork } from "@antumbra/platform-vocabulary/change-evidence.ts";

export const voyageCaptainWork = row("voyageCaptainWork", VoyageCaptainWork.fields, { key: "id", scope: "voyageId" });
