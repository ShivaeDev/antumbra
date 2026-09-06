import type { AgentEvent, RawPayload } from "@antumbra/vocabulary/session-events.ts";
import { Option, Schema } from "effect";
import { KnownItem } from "#protocol-items.ts";

type Item<T extends KnownItem["type"]> = Extract<KnownItem, { type: T }>;

export type SubAgentActivity = Item<"subAgentActivity">;
export type CollabCall = Item<"collabAgentToolCall">;

const decodeItem = Schema.decodeUnknownOption(KnownItem);

export const subAgentItem = (item: unknown): SubAgentActivity | CollabCall | undefined =>
	Option.match(decodeItem(item), {
		onNone: () => undefined,
		onSome: (known) => (known.type === "subAgentActivity" || known.type === "collabAgentToolCall" ? known : undefined),
	});

export const announced = (item: SubAgentActivity, threadId: string, spawnedBy: string, raw: RawPayload): AgentEvent => ({
	kind: item.agentPath,
	parentRef: threadId,
	raw,
	spawnedBy,
	subsessionRef: item.agentThreadId,
	type: "subsession.opened",
});

// Codex reports forced sub-agent termination as `interrupted`.
export const interrupted = (item: SubAgentActivity, raw: RawPayload): AgentEvent => ({
	outcome: "interrupted",
	raw,
	subsessionRef: item.agentThreadId,
	type: "subsession.ended",
});

export const closedWithoutWord = (subsessionRef: string, raw: RawPayload): AgentEvent => ({
	outcome: "unknown",
	raw,
	subsessionRef,
	type: "subsession.ended",
});

export const collabEvents = (item: CollabCall, raw: RawPayload, started: boolean): ReadonlyArray<AgentEvent> =>
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
