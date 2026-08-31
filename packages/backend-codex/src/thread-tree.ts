import type { AgentEvent, Origin, RawPayload } from "@antumbra/vocabulary/session-events";
import { Option, Schema } from "effect";
import type { RpcNotification } from "#adapters/rpc.ts";
import { rawOf, toAgentEvents } from "#mapping.ts";
import { ItemNotification, SpawnedThread, ThreadScoped } from "#protocol.ts";
import { announced, type CollabCall, closedWithoutWord, collabEvents, interrupted, type SubAgentActivity, subAgentItem } from "#subagent-items.ts";
import type { ThreadClaims } from "#thread-claims.ts";
import { attributed } from "#thread-origin.ts";

const decodeScoped = Schema.decodeUnknownOption(ThreadScoped);
const decodeSpawned = Schema.decodeUnknownOption(SpawnedThread);
const decodeItem = Schema.decodeUnknownOption(ItemNotification);

export interface ThreadTree {
	readonly events: (notification: RpcNotification) => ReadonlyArray<AgentEvent>;
}

// why: app-server broadcasts frames for every thread on one connection, each
// carrying its thread id. The live tree therefore filters the shared stream;
// passive census is the separate read-only connection.
export const openThreadTree = (rootThreadId: string, claims: ThreadClaims): ThreadTree => {
	const spawnCalls = new Map<string, string>();
	const stated = new Set<string>();
	const owns = (threadId: string): boolean => threadId === rootThreadId || claims.ownerOf(threadId) === rootThreadId;
	const once = (key: string): boolean => {
		if (stated.has(key)) {
			return false;
		}
		stated.add(key);
		return true;
	};
	const spawnedThread = (params: unknown): ReadonlyArray<AgentEvent> => {
		const spawned = decodeSpawned(params);
		if (Option.isNone(spawned)) {
			return [];
		}
		const { id, source } = spawned.value.thread;
		if (owns(source.subAgent.thread_spawn.parent_thread_id)) {
			claims.claim(rootThreadId, id);
		}
		return [];
	};
	const collab = (item: CollabCall, raw: RawPayload, started: boolean): ReadonlyArray<AgentEvent> => {
		for (const receiver of item.receiverThreadIds) {
			claims.claim(rootThreadId, receiver);
			spawnCalls.set(receiver, item.id);
		}
		return collabEvents(item, raw, started);
	};
	const activity = (item: SubAgentActivity, threadId: string, raw: RawPayload): ReadonlyArray<AgentEvent> => {
		claims.claim(rootThreadId, item.agentThreadId);
		const node = item.agentThreadId;
		if (item.kind === "interrupted") {
			return once(`ended/${node}`) ? [interrupted(item, raw)] : [{ raw, type: "raw" }];
		}
		return item.kind === "interacted" || !once(`opened/${node}`)
			? [{ raw, type: "raw" }]
			: [announced(item, threadId, spawnCalls.get(node) ?? item.id, raw)];
	};
	const lifecycle = (notification: RpcNotification, threadId: string): ReadonlyArray<AgentEvent> | undefined => {
		const decoded = decodeItem(notification.params);
		if (Option.isNone(decoded)) {
			return undefined;
		}
		const item = subAgentItem(decoded.value.item);
		if (item === undefined) {
			return undefined;
		}
		const raw = rawOf(notification.method, notification.params);
		return item.type === "collabAgentToolCall" ? collab(item, raw, notification.method === "item/started") : activity(item, threadId, raw);
	};
	const closed = (threadId: string, params: unknown): ReadonlyArray<AgentEvent> => {
		const raw = rawOf("thread/closed", params);
		return once(`ended/${threadId}`) ? [closedWithoutWord(threadId, raw)] : [{ raw, type: "raw" }];
	};
	const events = (notification: RpcNotification): ReadonlyArray<AgentEvent> => {
		if (notification.method === "thread/started") {
			return spawnedThread(notification.params);
		}
		const scoped = decodeScoped(notification.params);
		if (Option.isNone(scoped) || !owns(scoped.value.threadId)) {
			return [];
		}
		const threadId = scoped.value.threadId;
		if (threadId === rootThreadId) {
			return lifecycle(notification, threadId) ?? toAgentEvents(notification);
		}
		const mapped =
			notification.method === "thread/closed"
				? closed(threadId, notification.params)
				: (lifecycle(notification, threadId) ?? toAgentEvents(notification));
		const origin: Origin = {
			node: threadId,
			spawnedBy: spawnCalls.get(threadId) ?? threadId,
		};
		return mapped.map((event) => attributed(event, origin));
	};
	return { events };
};
