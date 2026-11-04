import { row } from "@antumbra/platform-feature/row.ts";
import { Repo } from "@antumbra/platform-vocabulary/repos.ts";
export const repo = row("repo", Repo.fields, { key: "id" });
