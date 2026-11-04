import { row } from "@antumbra/platform-feature/row.ts";
import { VoyageActivity } from "@antumbra/platform-vocabulary/change-evidence.ts";

export const voyageActivity = row("voyageActivity", VoyageActivity.fields, { key: "id", scope: "voyageId" });
