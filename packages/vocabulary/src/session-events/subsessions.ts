import { Schema } from "effect";
import { Origin } from "#session-events/origin.ts";
import { Raw } from "#session-events/raw.ts";

// why: a subsession is a nested provider conversation the session spawned
// through a tool call — part of the session, never an Agent. The opened events
// are the tree: one node and its parent edge, in the log, rebuildable. A
// backend that maps one provider frame at a time cannot name parentRef, so it
// stays optional and the edge is recovered on read by joining spawnedBy to the
// origin of the tool.started row that spawned the node. kind, label, and
// charter are optional because a provider does not always say them: work
// spawned by a workflow carries no description, and some charters never reach
// the wire at all.
export const SubsessionOpened = Schema.Struct({
	charter: Schema.optional(Schema.String),
	kind: Schema.optional(Schema.String),
	label: Schema.optional(Schema.String),
	parentRef: Schema.optional(Schema.String),
	raw: Raw,
	spawnedBy: Schema.String,
	// why: the provider-native reference — the future row's nativeRef, never a
	// primary key and never a journal key.
	subsessionRef: Schema.String,
	type: Schema.Literal("subsession.opened"),
});

// why: how a subsession stopped, in words this vocabulary owns. A provider
// word with no counterpart here reads as unknown rather than being bent into a
// neighbour; the provider's own word stays legible in raw.
export const SubsessionOutcome = Schema.Literals([
	"completed",
	"failed",
	"interrupted",
	"unknown",
]);

export const SubsessionEnded = Schema.Struct({
	durationMs: Schema.optional(Schema.Number),
	outcome: SubsessionOutcome,
	raw: Raw,
	subsessionRef: Schema.String,
	summary: Schema.optional(Schema.String),
	tokens: Schema.optional(Schema.Number),
	type: Schema.Literal("subsession.ended"),
});

// why: observing a subsession is best-effort — a stream detaches, a preview
// spills, a sidecar is absent — and the log must be able to say where it stopped
// seeing rather than leave a silent hole a reader mistakes for idleness.
//
// why: "read-truncated" and "sidecar-absent" are reserved, not produced. Both
// name a known loss that no path Antumbra reads today can observe: a truncated
// read is noted only in the provider's own on-disk transcript, and under the
// SDK entrypoint a delegated transcript arrives on the stream, so no sidecar
// exists whose absence could be seen. They stay declared so a backend that can
// observe either loss journals it without widening this set.
export const SubsessionGapKind = Schema.Literals([
	"adopted-late",
	"stream-detached",
	"append-failed",
	"spilled-preview",
	"read-truncated",
	"sidecar-absent",
	"census-missing",
	"unknown",
]);

// why: a gap observed inside a provider frame carries that frame's attribution,
// so it is journaled where the loss happened rather than on the root that
// happened to be listening. A gap the host observes about a node it already
// knows needs no origin — it is written straight to that node's own journal.
export const SubsessionGap = Schema.Struct({
	detail: Schema.optional(Schema.String),
	gapKind: SubsessionGapKind,
	origin: Schema.optional(Origin),
	raw: Raw,
	type: Schema.Literal("subsession.gap"),
});
