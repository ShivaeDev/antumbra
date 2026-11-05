import { row } from "@antumbra/platform-feature/row.ts";
import { Repo, RepoReference } from "@antumbra/platform-vocabulary/repos.ts";
import { Records } from "#records.ts";

export const repo = row("repo", Repo.fields, { key: "id" });
export const repoReference = row("repoReference", RepoReference.fields, { key: "id", scope: "repoId" });
export const rows = Records;
