import { BackendsEvent } from "@antumbra/platform-vocabulary/backends-event.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { backendCatalog, backendModel } from "#postgres/backends/rows.ts";
import { BackendsHistory } from "#postgres/backends/service.ts";
import { legacyEvents, legacyRows } from "#postgres/legacy.ts";
export const journalBackends = Effect.fn("BackendsFixture.readJournal")(function* (filename: string) {
	const source = yield* SqliteClient.make({ filename, readonly: true });
	const events = yield* legacyEvents(BackendsEvent, ["ModelsListed", "CapabilityObserved"]).pipe(Effect.provideService(SqlClient.SqlClient, source));
	return {
		events,
		backendModel: yield* legacyRows(backendModel).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		backendCatalog: yield* legacyRows(backendCatalog).pipe(Effect.provideService(SqlClient.SqlClient, source)),
	};
});
export const replayBackendsFixture = Effect.fn("BackendsFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalBackends>>) {
	const history = yield* BackendsHistory;
	for (const event of snapshot.events) yield* history.append(event.requestId, [event.value]);
	yield* history.rebuild();
	const rows = yield* history.rows();
	const matches =
		Schema.toEquivalence(Schema.Array(backendModel.Row))(snapshot.backendModel, yield* rows.backendModel.where({})) &&
		Schema.toEquivalence(Schema.Array(backendCatalog.Row))(snapshot.backendCatalog, yield* rows.backendCatalog.where({}));
	if (!matches) return yield* Effect.fail(new BackendsFixtureMismatch({ message: "Backends history does not reproduce the captured journal rows" }));
	return { backends: snapshot.events.length, events: snapshot.events.length };
});
export class BackendsFixtureMismatch extends Schema.TaggedError<BackendsFixtureMismatch>()("BackendsFixtureMismatch", { message: Schema.String }) {}
