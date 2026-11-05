import { berth } from "@antumbra/domain-reclamation/rows/berth.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { changeRefresh } from "#commands/refresh.ts";
import { change } from "#rows/change.ts";
export const world = query("world", {
	input: {},
	output: Schema.Struct({ changes: Schema.Array(change.Row), repos: Schema.Array(repo.Row), berths: Schema.Array(berth.Row) }),
	reads: [changeRefresh, change, repo, berth],
});
