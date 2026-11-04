import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { InputsEvent } from "@antumbra/platform-vocabulary/inputs-event.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { capacity, session, sessionInput, sessionOperation } from "#postgres/inputs/rows.ts";
import { InputsHistory } from "#postgres/inputs/service.ts";
import { legacyEvents, legacyRows } from "#postgres/legacy.ts";
export const journalInputs = Effect.fn("InputsFixture.readJournal")(function* (filename: string) {
	const source = yield* SqliteClient.make({ filename, readonly: true });
	const events = yield* legacyEvents(InputsEvent, ["InputRecorded", "InputDeliveryChanged", "InputDeliveryObserved", "InputRetried"]).pipe(
		Effect.provideService(SqlClient.SqlClient, source),
	);
	return {
		events,
		sessionInput: yield* legacyRows(sessionInput).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		session: yield* legacyRows(session).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		sessionOperation: yield* legacyRows(sessionOperation).pipe(Effect.provideService(SqlClient.SqlClient, source)),
		capacity: yield* legacyRows(capacity).pipe(Effect.provideService(SqlClient.SqlClient, source)),
	};
});
export const replayInputsFixture = Effect.fn("InputsFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalInputs>>) {
	const history = yield* InputsHistory;
	yield* history.append(Request.make("fixture:input-context"), [
		{
			_tag: "InputEvidenceObserved",
			sessions: snapshot.session,
			operations: snapshot.sessionOperation.filter((row) => row.inputId === null),
			capacities: snapshot.capacity,
			at: 0,
		},
	]);
	for (const event of snapshot.events) yield* history.append(event.requestId, [event.value]);
	yield* history.append(Request.make("fixture:input-evidence"), [
		{ _tag: "InputEvidenceObserved", sessions: snapshot.session, operations: snapshot.sessionOperation, capacities: snapshot.capacity, at: 0 },
	]);
	yield* history.rebuild();
	const rows = yield* history.rows();
	if (
		!(
			Schema.toEquivalence(Schema.Array(sessionInput.Row))(snapshot.sessionInput, yield* rows.sessionInput.where({})) &&
			Schema.toEquivalence(Schema.Array(session.Row))(snapshot.session, yield* rows.session.where({})) &&
			Schema.toEquivalence(Schema.Array(sessionOperation.Row))(snapshot.sessionOperation, yield* rows.sessionOperation.where({})) &&
			Schema.toEquivalence(Schema.Array(capacity.Row))(snapshot.capacity, yield* rows.capacity.where({}))
		)
	)
		return yield* Effect.fail(new InputsFixtureMismatch({ message: "Inputs history does not reproduce captured rows" }));
	return { inputs: snapshot.events.length, events: snapshot.events.length };
});
export class InputsFixtureMismatch extends Schema.TaggedError<InputsFixtureMismatch>()("InputsFixtureMismatch", { message: Schema.String }) {}
