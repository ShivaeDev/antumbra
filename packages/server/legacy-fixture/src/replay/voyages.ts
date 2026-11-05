import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Voyage, VoyageEvent } from "@antumbra/platform-vocabulary/voyage.ts";
import { VoyageHistory } from "@antumbra/server-storage/voyages/service.ts";
import { Effect, Schema } from "effect";
import { LegacySource } from "#source.ts";

export const journalVoyages = Effect.fn("VoyageFixture.readJournal")(function* (filename: string) {
	const source = yield* (yield* LegacySource).open(filename);
	const entries = yield* source`select name, payload, requestId from journal
		where name in ('VoyageOpened', 'FocusSet', 'QuietSet') order by seq`.pipe(
		Effect.flatMap(
			Schema.decodeUnknownEffect(
				Schema.Array(
					Schema.Struct({
						name: Schema.String,
						payload: Schema.String,
						requestId: Request,
					}),
				),
			),
		),
	);
	const events = yield* Effect.forEach(entries, (entry) =>
		Effect.gen(function* () {
			const payload = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)))(entry.payload);
			const value = yield* Schema.decodeUnknownEffect(VoyageEvent)({ ...payload, _tag: entry.name });
			return { requestId: entry.requestId, value };
		}),
	);
	const voyages = yield* source`select * from voyage order by openedAt, rowid`.pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Voyage))));
	return { events, voyages };
});

export const replayVoyageFixture = Effect.fn("VoyageFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalVoyages>>) {
	const history = yield* VoyageHistory;
	for (const event of snapshot.events) yield* history.append(event.requestId, event.value);
	const actual = yield* history.list();
	if (!Schema.toEquivalence(Schema.Array(Voyage))(snapshot.voyages, actual)) {
		return yield* Effect.fail(new VoyageFixtureMismatch({ message: "Voyage history does not reproduce the captured journal rows" }));
	}
	return { voyages: actual.length, events: snapshot.events.length };
});

export class VoyageFixtureMismatch extends Schema.TaggedError<VoyageFixtureMismatch>()("VoyageFixtureMismatch", { message: Schema.String }) {}
