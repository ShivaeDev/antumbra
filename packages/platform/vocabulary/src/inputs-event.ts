import { Schema } from "effect";
import { AgentBackendTagSchema } from "#agent-backend.ts";
import { CapacityObservationFields } from "#capacity.ts";
import { DeliveryStatus, Prepared } from "#inputs.ts";
import { Session } from "#session.ts";
import { SessionId, SessionOperationId } from "#session-ids.ts";
import { SessionInputId } from "#session-input.ts";
import { SessionOperation } from "#session-operation.ts";
export const InputRecordedPayload = Schema.Struct({ ...Prepared.fields, deliveryKind: Schema.Literals(["wake", "steer"]) });
export const InputDeliveryChangedPayload = Schema.Struct({
	id: SessionInputId,
	status: DeliveryStatus,
	detail: Schema.NullOr(Schema.String),
});
export const InputDeliveryObservedPayload = Schema.Struct({
	sessionId: Schema.String,
	inputId: Schema.String,
	operationId: Schema.String,
	status: Schema.Literals(["accepted", "ambiguous", "refused"]),
	detail: Schema.NullOr(Schema.String),
});
export const InputRetriedPayload = Schema.Struct({
	id: SessionInputId,
	sessionId: SessionId,
	operationId: SessionOperationId,
	deliveryKind: Schema.Literals(["wake", "steer"]),
});
export const Capacity = Schema.Struct({ ...CapacityObservationFields, backend: AgentBackendTagSchema });
export const InputEvidence = Schema.Struct({
	sessions: Schema.Array(Session),
	operations: Schema.Array(SessionOperation),
	capacities: Schema.Array(Capacity),
});
export const InputsEvent = Schema.Union([
	Schema.Struct({ _tag: Schema.Literal("InputEvidenceObserved"), ...InputEvidence.fields, at: Schema.Number }),
	Schema.Struct({
		_tag: Schema.Literal("InputRecorded"),
		...InputRecordedPayload.fields,
		at: Schema.Number,
		sequence: Schema.optionalKey(Schema.Number),
	}),
	Schema.Struct({
		_tag: Schema.Literal("InputDeliveryChanged"),
		...InputDeliveryChangedPayload.fields,
		at: Schema.Number,
		sequence: Schema.optionalKey(Schema.Number),
	}),
	Schema.Struct({
		_tag: Schema.Literal("InputDeliveryObserved"),
		...InputDeliveryObservedPayload.fields,
		at: Schema.Number,
		sequence: Schema.optionalKey(Schema.Number),
	}),
	Schema.Struct({
		_tag: Schema.Literal("InputRetried"),
		...InputRetriedPayload.fields,
		at: Schema.Number,
		sequence: Schema.optionalKey(Schema.Number),
	}),
]);
