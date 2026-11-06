import { decode } from "@antumbra/legacy-fixture/v1/decode.ts";
import type { StoredFact } from "@antumbra/legacy-fixture/v1/migration.ts";
import { ChangesEvent } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { ReposEvent } from "@antumbra/platform-vocabulary/repos-event.ts";
import type { SessionId } from "@antumbra/platform-vocabulary/session-ids.ts";
import { SettingsEvent } from "@antumbra/platform-vocabulary/settings-event.ts";
import { histories } from "@antumbra/server/services.ts";
import { ChangesHistory } from "@antumbra/server-storage/changes/service.ts";
import { ExecutionDefinition } from "@antumbra/server-storage/execution/definition.ts";
import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { rebuild } from "@antumbra/server-storage/rebuild.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { ReposHistory } from "@antumbra/server-storage/repos/service.ts";
import { SettingsHistory } from "@antumbra/server-storage/settings/service.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, FileSystem, Layer, Path, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { withIsolatedDatabase } from "@shivaedev/test-sql/server/withIsolatedDatabase.ts";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { postgresTests } from "#postgres-testing.ts";

export interface LegacyFact {
	readonly name: string;
	readonly payload: Readonly<Record<string, unknown>>;
	readonly at?: number;
	readonly requestId?: string;
}
const read = Effect.fn("LegacyStory.read")(function* (facts: readonly LegacyFact[]) {
	const path = yield* Path.Path;
	const file = path.join(yield* (yield* FileSystem.FileSystem).makeTempDirectoryScoped(), "v1.db");
	const sql = yield* SqliteClient.make({ filename: file });
	yield* sql`create table journal(seq integer primary key,at integer not null,requestId text not null,name text not null,payload text not null)`;
	for (const [index, fact] of facts.entries())
		yield* sql`insert into journal ${sql.insert({ seq: index + 1, at: fact.at ?? 100 + index, requestId: fact.requestId ?? `legacy:${index}`, name: fact.name, payload: JSON.stringify(fact.payload) })}`;
	return yield* decode().pipe(Effect.provideService(SqlClient.SqlClient, sql));
});
const create = Effect.fn("LegacyStory.create")(function* () {
	const services = yield* Layer.build(histories);
	const rows = yield* Records.pipe(Effect.provideContext(services));
	let facts: readonly StoredFact[] = [];
	const append = (fact: StoredFact) =>
		Effect.gen(function* () {
			const settings = yield* SettingsHistory;
			const changes = yield* ChangesHistory;
			const repos = yield* ReposHistory;
			const execution = yield* ExecutionHistory;
			const model = yield* ExecutionDefinition;

			const value = { ...fact.payload, _tag: fact.name, at: fact.at, sequence: fact.seq };
			if (Schema.is(SettingsEvent)(value)) yield* settings.append(Request.make(fact.requestId), [value]);
			else if (Schema.is(ChangesEvent)(value)) yield* changes.append(Request.make(fact.requestId), [value]);
			else if (Schema.is(ReposEvent)(value)) yield* repos.append(Request.make(fact.requestId), [value]);
			else yield* execution.append(Request.make(fact.requestId), [yield* Schema.decodeUnknownEffect(model.events)(value)]);
		});
	const seed = (given: readonly LegacyFact[]) =>
		Effect.gen(function* () {
			facts = yield* read(given).pipe(Effect.scoped);
			for (const fact of facts) yield* append(fact);
		}).pipe(Effect.provideContext(services));
	return {
		seed,
		rebuild: () => rebuild().pipe(Effect.provideContext(services)),
		facts: () => Effect.succeed(facts),
		flags: () => rows.flag.findMany({ orderBy: { field: "key", direction: "asc" }, select: ["key", "on"] }),
		session: (id: SessionId) => rows.session.findById(id),
		operations: () => rows.sessionOperation.findMany({ orderBy: { field: "storage_order", direction: "asc" }, select: ["id", "kind", "status"] }),
		usage: (id: SessionId) => rows.sessionUsage.findMany({ where: { sessionId: id } }).pipe(Effect.map((rows) => rows[0])),
		changes: () => rows.change.findMany({ orderBy: { field: "storage_order", direction: "asc" }, select: ["id", "review"] }),
		feedback: () => rows.changeFeedback.findMany({ orderBy: { field: "storage_order", direction: "asc" }, select: ["id", "changeId"] }),
	};
});
export const legacyFacts = storyKit({
	name: "Legacy journal v1 replay",
	clock: "test",
	layer: postgresTests.pipe(Layer.provideMerge(NodeServices.layer)),
	around: withIsolatedDatabase,
	stages: [],
	create,
	verbs: (engine) => engine,
});
