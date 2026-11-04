import { row } from "@antumbra/platform-feature/row.ts";
import { RepoReference } from "@antumbra/platform-vocabulary/repos.ts";
export const repoReference = row("repoReference", RepoReference.fields, { key: "id", scope: "repoId" });
