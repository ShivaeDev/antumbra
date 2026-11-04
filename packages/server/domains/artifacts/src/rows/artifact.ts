import { row } from "@antumbra/platform-feature/row.ts";
import { Artifact } from "@antumbra/platform-vocabulary/artifacts.ts";
export const artifact = row("artifact", Artifact.fields, { key: "id", scope: "pieceId" });
