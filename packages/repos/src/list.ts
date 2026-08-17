import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import type { RegisteredRepo } from "#model.ts";

const summarize = (row: {
	readonly defaultRef: string;
	readonly id: string;
	readonly name: string;
	readonly source: string;
}): RegisteredRepo => ({
	defaultRef: row.defaultRef,
	id: row.id,
	name: row.name,
	source: row.source,
});

export const listRepos = Effect.gen(function* () {
	const db = yield* Database;
	const rows = yield* db.Repo.orderBy((repo) => repo.createdAt.asc()).all();
	return rows.map(summarize);
});

export { summarize as summarizeRepo };
