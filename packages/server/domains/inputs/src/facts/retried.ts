import { SessionId, SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Schema } from "effect";
export const inputRetried = fact("InputRetried", {
	id: SessionInputId,
	sessionId: SessionId,
	operationId: SessionOperationId,
	deliveryKind: Schema.Literals(["wake", "steer"]),
});
