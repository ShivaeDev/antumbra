import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { ChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { Schema } from "effect";
import { quayChange } from "#rows/quay-change.ts";

export const QuayStatus = Schema.Literals(["all", "alongside", "archived", "checksRunning", "draft", "landed", "needsAttention"]);

export const browse = query("browse", {
	input: { query: Schema.String, repositoryId: Schema.NullOr(RepoId), status: QuayStatus, selectedId: Schema.NullOr(ChangeId) },
	output: Schema.Struct({
		rows: Schema.Array(quayChange.Row),
		total: Schema.Number,
		waiting: Schema.Number,
		selected: Schema.NullOr(quayChange.Row),
		repositories: Schema.Array(Schema.Struct({ id: RepoId, name: Schema.String })),
		sightedAt: Schema.NullOr(Schema.String),
	}),
	reads: [quayChange, repo],
});
