import type { InputsEvent } from "@antumbra/platform-vocabulary/inputs-event.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { projectInputDeliveryChanged } from "#postgres/inputs/projections/input-delivery-changed.ts";
import { projectInputDeliveryObserved } from "#postgres/inputs/projections/input-delivery-observed.ts";
import { projectInputEvidenceObserved } from "#postgres/inputs/projections/input-evidence-observed.ts";
import { projectInputRecorded } from "#postgres/inputs/projections/input-recorded.ts";
import { projectInputRetried } from "#postgres/inputs/projections/input-retried.ts";
import type { rows } from "#postgres/inputs/rows.ts";

type Rows = Effect.Success<typeof rows>;
export const apply = (rows: Rows) =>
	Effect.fn("InputsHistory.apply")(function* ({ value, streamVersion }: Event<typeof InputsEvent.Type>) {
		switch (value._tag) {
			case "InputEvidenceObserved":
				yield* projectInputEvidenceObserved(rows)(value);
				break;
			case "InputRecorded":
				yield* projectInputRecorded(rows)(value, streamVersion);
				break;
			case "InputDeliveryChanged":
				yield* projectInputDeliveryChanged(rows)(value);
				break;
			case "InputDeliveryObserved":
				yield* projectInputDeliveryObserved(rows)(value);
				break;
			case "InputRetried":
				yield* projectInputRetried(rows)(value, streamVersion);
				break;
		}
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from antumbra."sessionInput"`;
	yield* sql`delete from antumbra."input_sessions"`;
	yield* sql`delete from antumbra."input_operations"`;
	yield* sql`delete from antumbra."input_capacity"`;
	yield* invalidateOnCommit(["sessionInput", "session", "sessionOperation", "capacity"]);
});
