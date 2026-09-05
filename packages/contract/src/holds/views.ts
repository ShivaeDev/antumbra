import { Schema } from "effect";
import { HoldKind } from "#holds/catalog.ts";

export const MailWaiting = Schema.Struct({
	count: Schema.Number,
	precedence: Schema.Literals(["flash", "priority", "routine"]),
});
export type MailWaiting = typeof MailWaiting.Type;

export const HoldWaiting = Schema.Struct({
	id: Schema.String,
	mail: Schema.NullOr(MailWaiting),
	title: Schema.String,
	voyage: Schema.NullOr(Schema.String),
	waitedMillis: Schema.Number,
});
export type HoldWaiting = typeof HoldWaiting.Type;

export const HoldQueue = Schema.Struct({
	kind: HoldKind,
	waiting: Schema.Array(HoldWaiting),
});
export type HoldQueue = typeof HoldQueue.Type;

export const HoldsView = Schema.Struct({
	queues: Schema.Array(HoldQueue),
});
export type HoldsView = typeof HoldsView.Type;
