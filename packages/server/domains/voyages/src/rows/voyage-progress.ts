import { row } from "@antumbra/platform-feature/row.ts";
import { VoyageProgress } from "@antumbra/platform-vocabulary/voyage.ts";

export const voyageProgress = row("voyageProgress", VoyageProgress.fields, { key: "id" });
