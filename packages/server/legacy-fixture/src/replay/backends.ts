import { BackendsEvent } from "@antumbra/platform-vocabulary/backends-event.ts";
import { backendCatalog, backendModel } from "@antumbra/server-storage/backends/rows.ts";
import { BackendsHistory } from "@antumbra/server-storage/backends/service.ts";
import { selection as backendCatalogSelection } from "@antumbra/server-storage/records/backend-catalog.ts";
import { selection as backendModelSelection } from "@antumbra/server-storage/records/backend-model.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { LegacySource } from "#source.ts";
import { legacyEvents, legacyRows } from "#v1-rows.ts";
export const journalBackends = Effect.fn("BackendsFixture.readJournal")(function* (filename: string) {
	const source = yield* (yield* LegacySource).open(filename);
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
	const rows = yield* history.rows();
	const matches =
		Schema.toEquivalence(Schema.Array(backendModel.Row))(
			snapshot.backendModel,
			yield* rows.backendModel
				.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: backendModelSelection })
				.pipe(Effect.orDie),
		) &&
		Schema.toEquivalence(Schema.Array(backendCatalog.Row))(
			snapshot.backendCatalog,
			yield* rows.backendCatalog
				.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: backendCatalogSelection })
				.pipe(Effect.orDie),
		);
	if (!matches) return yield* Effect.fail(new BackendsFixtureMismatch({ message: "Backends history does not reproduce the captured journal rows" }));
	return { backends: snapshot.events.length, events: snapshot.events.length };
});
export class BackendsFixtureMismatch extends Schema.TaggedError<BackendsFixtureMismatch>()("BackendsFixtureMismatch", { message: Schema.String }) {}
