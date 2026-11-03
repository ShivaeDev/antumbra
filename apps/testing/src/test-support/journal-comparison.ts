import { apiOf } from "@antumbra/server-journal/testing/api.ts";
import { snapshotJournal } from "@antumbra/server-journal/testing/snapshot.ts";
import { Effect, Layer } from "effect";
import { definition, layer } from "#app.ts";

export const journalComparison = Effect.fn("PostgresApp.journalComparison")(function* () {
	const services = yield* Layer.build(layer);
	const api = yield* apiOf(definition).pipe(Effect.provideContext(services));
	return { api, snapshot: (filename: string) => snapshotJournal(filename).pipe(Effect.provideContext(services)) };
});
