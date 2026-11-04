import { row } from "@antumbra/platform-feature/row.ts";
import { Repo, RepoReference } from "@antumbra/platform-vocabulary/repos.ts";
import { Effect } from "effect";
import { rowsOf } from "#postgres/rows.ts";

export const repo = row("repo", Repo.fields, { key: "id" });
export const repoReference = row("repoReference", RepoReference.fields, { key: "id", scope: "repoId" });
export const rows = Effect.gen(function* () {
	return { repo: yield* rowsOf(repo, "repo", "storage_order"), repoReference: yield* rowsOf(repoReference, "repoReference", "storage_order") };
});
