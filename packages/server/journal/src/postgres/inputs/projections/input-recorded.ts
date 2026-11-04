import type { InputsEvent } from "@antumbra/platform-vocabulary/inputs-event.ts";
import { SessionId, SessionOperationId } from "@antumbra/platform-vocabulary/session-ids.ts";
import type { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect } from "effect";
import type { rows } from "#postgres/inputs/rows.ts";

const inputOperationId = (id: typeof SessionInputId.Type) => SessionOperationId.make(`input-delivery:${id}`);

type Rows = Effect.Success<typeof rows>;
export const projectInputRecorded = (rows: Rows) =>
	Effect.fn("InputsHistory.projectInputRecorded")(function* (
		fact: Extract<typeof InputsEvent.Type, { readonly _tag: "InputRecorded" }>,
		streamVersion: number,
	) {
		yield* rows.session.update(SessionId.make(fact.sessionId), { stoppedAt: null });
		yield* rows.sessionInput.insert({
			id: fact.id,
			sessionId: fact.sessionId,
			requestDigest: fact.requestDigest,
			parts: fact.parts,
			status: "pending",
			detail: null,
			createdAt: fact.at,
		});
		yield* rows.sessionOperation.insert({
			id: inputOperationId(fact.id),
			sessionId: SessionId.make(fact.sessionId),
			inputId: fact.id,
			kind: fact.deliveryKind,
			reason: "",
			status: "requested",
			detail: null,
			requestedAt: new Date(fact.at).toISOString(),
			sequence: fact.sequence ?? streamVersion,
			gatedBy: null,
		});
	});
