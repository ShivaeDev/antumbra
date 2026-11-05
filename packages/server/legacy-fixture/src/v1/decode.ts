import { Effect, Schema, SchemaRepresentation } from "effect";
import { SqlClient } from "effect/sql";
import type { StoredFact } from "#v1/migration.ts";
import { migrations } from "#v1/migrations.ts";
import schema from "#v1/schema.json" with { type: "json" };

const document = Schema.Struct({
	dialect: Schema.Literal("draft-2020-12"),
	schema: Schema.Record(Schema.String, Schema.Unknown),
	definitions: Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Unknown)),
});
const archive = Schema.Struct({ version: Schema.Literal(1), facts: Schema.Record(Schema.String, document) });
const stored = Schema.Struct({
	seq: Schema.Number,
	at: Schema.Number,
	requestId: Schema.String,
	name: Schema.String,
	payload: Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)),
});
const validator = (documents: typeof archive.Type.facts) => {
	const validators = new Map<string, (value: unknown) => boolean>();
	return (fact: StoredFact) => {
		let valid = validators.get(fact.name);
		if (valid === undefined) {
			const document = documents[fact.name];
			if (document === undefined) return false;
			valid = Schema.is(SchemaRepresentation.fromJsonSchemaDocument(document));
			validators.set(fact.name, valid);
		}
		return valid(fact.payload);
	};
};
export class LegacyFactInvalid extends Schema.TaggedError<LegacyFactInvalid>()("LegacyFactInvalid", { name: Schema.String, seq: Schema.Number }) {
	override get message() {
		return `Legacy journal v1 fact ${this.seq} (${this.name}) does not match its archived schema`;
	}
}
export const decode = Effect.fn("LegacyV1.decode")(function* (names?: readonly string[]) {
	const sql = yield* SqlClient.SqlClient;
	const model = yield* Schema.decodeUnknownEffect(archive)(schema);
	const valid = validator(model.facts);
	const known = yield* sql`select name from sqlite_master where type = 'table' and name = 'fact_migration'`;
	const applied =
		known.length === 0
			? []
			: yield* sql`select feature,number from fact_migration`.pipe(
					Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ feature: Schema.String, number: Schema.Number })))),
				);
	const pending = migrations.filter((migration) => !applied.some((row) => row.feature === migration.feature && row.number === migration.number));
	const entries =
		yield* sql`select seq,at,requestId,name,payload from journal where ${names === undefined ? sql`true` : sql`name in ${sql.in(names)}`} order by seq`.pipe(
			Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(stored))),
		);
	const facts: StoredFact[] = [];
	for (const entry of entries) {
		let folded: StoredFact | undefined = entry;
		for (const migration of pending) if (folded !== undefined && folded.name === migration.fact) folded = yield* migration.rewrite(folded);
		if (folded === undefined) continue;
		if (!valid(folded)) return yield* new LegacyFactInvalid({ name: folded.name, seq: folded.seq });
		facts.push(folded);
	}
	return facts;
});
