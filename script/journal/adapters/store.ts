import { DatabaseSync } from "node:sqlite";
import { Effect, Schema } from "effect";
import type { Entry, Reading } from "#journal/report.ts";

const Tallies = Schema.Array(Schema.Struct({ name: Schema.String, count: Schema.Number }));
const Totals = Schema.Struct({ total: Schema.Number, highest: Schema.Number });
const Recent = Schema.Array(Schema.Struct({ seq: Schema.Number, at: Schema.Number, name: Schema.String, requestId: Schema.String }));

const TALLIES = `SELECT "name", count(*) AS "count" FROM "journal" GROUP BY "name"`;
const TOTALS = `SELECT count(*) AS "total", coalesce(max("seq"), 0) AS "highest" FROM "journal"`;
const RECENT = `SELECT "seq", "at", "name", "requestId" FROM "journal" ORDER BY "seq" DESC LIMIT ?`;

const toError = (cause: unknown): Error => (cause instanceof Error ? cause : new Error(String(cause)));

interface Raw {
	readonly tallies: unknown;
	readonly totals: unknown;
	readonly recent: unknown;
}

const query = (file: string, tail: number): Raw => {
	const database = new DatabaseSync(file, { readOnly: true });
	try {
		return {
			recent: tail === 0 ? [] : database.prepare(RECENT).all(tail),
			tallies: database.prepare(TALLIES).all(),
			totals: database.prepare(TOTALS).get(),
		};
	} finally {
		database.close();
	}
};

const decode = <S extends Schema.Top>(schema: S, raw: unknown): Effect.Effect<S["Type"], Error, S["DecodingServices"]> =>
	Schema.decodeUnknownEffect(schema)(raw).pipe(Effect.mapError((issue) => new Error(issue.message)));

export const readJournal = (file: string, tail: number): Effect.Effect<Reading, Error> =>
	Effect.gen(function* () {
		const raw = yield* Effect.try({ catch: toError, try: () => query(file, tail) });
		const tallies = new Map<string, number>();
		for (const tally of yield* decode(Tallies, raw.tallies)) tallies.set(tally.name, tally.count);
		const totals = yield* decode(Totals, raw.totals);
		const recent: readonly Entry[] = (yield* decode(Recent, raw.recent)).toReversed();
		return { highest: totals.highest, recent, tallies, total: totals.total };
	});
