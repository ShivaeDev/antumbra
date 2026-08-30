import type { BackendCapacityClassification } from "@antumbra/plugin-api";
import type { RawPayload } from "@antumbra/vocabulary/session-events";
import { Option, Schema } from "effect";

const CapacityError = Schema.Struct({
	error: Schema.Struct({
		codexErrorInfo: Schema.optional(Schema.NullOr(Schema.String)),
		message: Schema.String,
	}),
	threadId: Schema.String,
	turnId: Schema.String,
	willRetry: Schema.Boolean,
});

const decodeCapacityError = Schema.decodeUnknownOption(
	Schema.fromJsonString(CapacityError),
);

export const classifyCodexCapacity = (
	raw: RawPayload,
): Option.Option<BackendCapacityClassification> => {
	if (raw.source !== "codex" || raw.kind !== "error") {
		return Option.none();
	}
	const decoded = decodeCapacityError(raw.payload);
	if (
		Option.isNone(decoded) ||
		decoded.value.willRetry ||
		decoded.value.error.codexErrorInfo !== "usageLimitExceeded"
	) {
		return Option.none();
	}
	// why: a retry Codex owns is not an account hold, and overload remains a
	// transient provider failure. Only terminal usage exhaustion says further
	// turns cannot make progress without an external capacity change.
	const blocked = {
		detail: decoded.value.error.message,
		reason: "usage-limit" as const,
		status: "blocked" as const,
	};
	return Option.some<BackendCapacityClassification>(blocked);
};
