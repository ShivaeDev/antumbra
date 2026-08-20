import type {
	AgentEvent,
	RawPayload,
} from "@antumbra/vocabulary/session-events";
import { Option, Schema } from "effect";
import { KnownItem } from "#protocol-items.ts";

type Item<T extends KnownItem["type"]> = Extract<KnownItem, { type: T }>;

export type SubAgentActivity = Item<"subAgentActivity">;
export type CollabCall = Item<"collabAgentToolCall">;

const decodeItem = Schema.decodeUnknownOption(KnownItem);

// why: the two items that say anything about a thread's own agents. Everything
// else on the wire is transcript and is read by the item projection this
// backend already has.
export const subAgentItem = (
	item: unknown,
): SubAgentActivity | CollabCall | undefined =>
	Option.match(decodeItem(item), {
		onNone: () => undefined,
		onSome: (known) =>
			known.type === "subAgentActivity" || known.type === "collabAgentToolCall"
				? known
				: undefined,
	});

// why: the announcement names what the node is — the agent definition codex ran
// — and where it belongs: the thread that posted it, and the call that spawned
// it when this thread saw that call. Nothing here is a name for the node; codex
// gives it none, and inventing one would be the record speaking for it.
export const announced = (
	item: SubAgentActivity,
	threadId: string,
	spawnedBy: string,
	raw: RawPayload,
): AgentEvent => ({
	kind: item.agentPath,
	parentRef: threadId,
	raw,
	spawnedBy,
	subsessionRef: item.agentThreadId,
	type: "subsession.opened",
});

// why: `interrupted` is codex's own declared word for a forced ending, so it
// folds onto the vocabulary's word of the same meaning. A terminal signal codex
// declares no word for folds to unknown instead, with what it did say kept in
// raw — a provider's ending is never bent into a neighbouring one.
export const interrupted = (
	item: SubAgentActivity,
	raw: RawPayload,
): AgentEvent => ({
	outcome: "interrupted",
	raw,
	subsessionRef: item.agentThreadId,
	type: "subsession.ended",
});

export const closedWithoutWord = (
	subsessionRef: string,
	raw: RawPayload,
): AgentEvent => ({
	outcome: "unknown",
	raw,
	subsessionRef,
	type: "subsession.ended",
});

// why: spawning an agent is a tool call the thread made, and reads as one — so
// the transcript shows the work being handed over, and the call is remembered
// against the journal it was written to. That memory is what tells a node's own
// children which Session spawned them.
export const collabEvents = (
	item: CollabCall,
	raw: RawPayload,
	started: boolean,
): ReadonlyArray<AgentEvent> =>
	started
		? [
				{
					input: item.prompt ?? "",
					name: item.tool,
					raw,
					toolId: item.id,
					type: "tool.started",
				},
			]
		: [
				{
					ok: item.status === "completed",
					output: item.receiverThreadIds.join("\n"),
					raw,
					toolId: item.id,
					type: "tool.completed",
				},
			];
