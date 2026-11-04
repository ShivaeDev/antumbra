import { InputsEvent } from "@antumbra/platform-vocabulary/inputs-event.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { sessionInput } from "#postgres/inputs/rows.ts";
import { InputsHistory } from "#postgres/inputs/service.ts";
import { legacyEvents, legacyRows } from "#postgres/legacy.ts";
export const journalInputs = Effect.fn("InputsFixture.readJournal")(function* (filename: string) {
	const source = yield* SqliteClient.make({ filename, readonly: true });
	return {
		events: yield* legacyEvents(InputsEvent, ["InputRecorded", "InputDeliveryChanged", "InputDeliveryObserved", "InputRetried"]).pipe(
			Effect.provideService(SqlClient.SqlClient, source),
		),
		sessionInput: yield* legacyRows(sessionInput).pipe(Effect.provideService(SqlClient.SqlClient, source)),
	};
});
export const replayInputsFixture = Effect.fn("InputsFixture.checkReplay")(function* (snapshot: Effect.Success<ReturnType<typeof journalInputs>>) {
	const rows = yield* (yield* InputsHistory).rows();
	if (!Schema.toEquivalence(Schema.Array(sessionInput.Row))(snapshot.sessionInput, yield* rows.sessionInput.where({})))
		return yield* Effect.fail(new InputsFixtureMismatch({ message: "Input history does not reproduce captured rows" }));
	return { inputs: snapshot.events.length, events: 0 };
});
export class InputsFixtureMismatch extends Schema.TaggedError<InputsFixtureMismatch>()("InputsFixtureMismatch", { message: Schema.String }) {}
