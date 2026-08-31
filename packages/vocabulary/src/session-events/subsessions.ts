import { Schema } from "effect";
import { Origin } from "#session-events/origin.ts";
import { Raw } from "#session-events/raw.ts";

export const SubsessionOpened = Schema.Struct({
	charter: Schema.optional(Schema.String),
	kind: Schema.optional(Schema.String),
	label: Schema.optional(Schema.String),
	parentRef: Schema.optional(Schema.String),
	raw: Raw,
	spawnedBy: Schema.String,
	subsessionRef: Schema.String,
	type: Schema.Literal("subsession.opened"),
});

export const SubsessionOutcome = Schema.Literals(["completed", "failed", "interrupted", "unknown"]);

export const SubsessionEnded = Schema.Struct({
	durationMs: Schema.optional(Schema.Number),
	outcome: SubsessionOutcome,
	raw: Raw,
	subsessionRef: Schema.String,
	summary: Schema.optional(Schema.String),
	tokens: Schema.optional(Schema.Number),
	type: Schema.Literal("subsession.ended"),
});

const SubsessionGapKind = Schema.Literals(["adopted-late", "stream-detached", "append-failed", "spilled-preview", "census-missing", "unknown"]);

export const SubsessionGap = Schema.Struct({
	detail: Schema.optional(Schema.String),
	gapKind: SubsessionGapKind,
	origin: Schema.optional(Origin),
	raw: Raw,
	type: Schema.Literal("subsession.gap"),
});
