import { InputsEvent } from "@antumbra/platform-vocabulary/inputs-event.ts";
import { sessionInput } from "@antumbra/server-storage/inputs/rows.ts";
import { InputsHistory } from "@antumbra/server-storage/inputs/service.ts";
import { selection as sessionInputSelection } from "@antumbra/server-storage/records/session-input.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { LegacySource } from "#source.ts";
import { legacyEvents, legacyRows } from "#v1-rows.ts";
export const journalInputs = Effect.fn("InputsFixture.readJournal")(function* (filename: string) {
	const source = yield* (yield* LegacySource).open(filename);
	return {
		events: yield* legacyEvents(InputsEvent, ["InputRecorded", "InputDeliveryChanged", "InputDeliveryObserved", "InputRetried"]).pipe(
			Effect.provideService(SqlClient.SqlClient, source),
		),
		sessionInput: yield* legacyRows(sessionInput).pipe(Effect.provideService(SqlClient.SqlClient, source)),
	};
});
export const replayInputsFixture = Effect.fn("InputsFixture.checkReplay")(function* (snapshot: Effect.Success<ReturnType<typeof journalInputs>>) {
	const rows = yield* (yield* InputsHistory).rows();
	if (
		!Schema.toEquivalence(Schema.Array(sessionInput.Row))(
			snapshot.sessionInput,
			yield* rows.sessionInput
				.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionInputSelection })
				.pipe(Effect.orDie),
		)
	)
		return yield* Effect.fail(new InputsFixtureMismatch({ message: "Input history does not reproduce captured rows" }));
	return { inputs: snapshot.events.length, events: 0 };
});
export class InputsFixtureMismatch extends Schema.TaggedError<InputsFixtureMismatch>()("InputsFixtureMismatch", { message: Schema.String }) {}
