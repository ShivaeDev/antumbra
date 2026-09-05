import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import type { RulingContext } from "#model.ts";
import type { StoredRulingContext } from "#stored-rows.ts";

export const storedContext = (row: StoredRulingContext): RulingContext => ({
	at: row.at,
	authorAgentId: Option.fromNullOr(row.authorAgentId),
	body: row.body,
});

export const contextsOf = (rulingId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.RulingContext.where({ rulingId })
			.orderBy((row) => row.at.asc())
			.all();
		return rows.map(storedContext);
	});
