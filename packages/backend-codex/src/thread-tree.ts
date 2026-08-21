import type {
	AgentEvent,
	Origin,
	RawPayload,
} from "@antumbra/vocabulary/session-events";
import { Option, Schema } from "effect";
import type { RpcNotification } from "#adapters/rpc.ts";
import { rawOf, toAgentEvents } from "#mapping.ts";
import { ItemNotification, SpawnedThread, ThreadScoped } from "#protocol.ts";
import {
	announced,
	type CollabCall,
	closedWithoutWord,
	collabEvents,
	interrupted,
	type SubAgentActivity,
	subAgentItem,
} from "#subagent-items.ts";
import type { ThreadClaims } from "#thread-claims.ts";
import { attributed } from "#thread-origin.ts";

const decodeScoped = Schema.decodeUnknownOption(ThreadScoped);
const decodeSpawned = Schema.decodeUnknownOption(SpawnedThread);
const decodeItem = Schema.decodeUnknownOption(ItemNotification);

export interface ThreadTree {
	readonly events: (notification: RpcNotification) => ReadonlyArray<AgentEvent>;
}

// why: codex broadcasts the whole tree down the one connection this session
// listens on, every frame stamped with the thread that spoke it. Reading a
// delegated conversation as it happens therefore takes no second connection and
// no attaching — only the willingness to stop filtering everything but this
// thread out. The census that follows a silent stream is the one reader that
// opens a connection of its own, and that one can only read. What may be read
// here is what this session was shown to own: a thread codex sourced from a
// spawn of ours, or one an owned thread announced as its own.
export const openThreadTree = (
	rootThreadId: string,
	claims: ThreadClaims,
): ThreadTree => {
	const spawnCalls = new Map<string, string>();
	const stated = new Set<string>();
	const owns = (threadId: string): boolean =>
		threadId === rootThreadId || claims.ownerOf(threadId) === rootThreadId;
	// why: codex says the same thing twice, as an item starts and as it
	// completes, and a node opens and ends once. The repetition keeps its place
	// in the log as the provider's own words rather than a second lifecycle.
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
	const collab = (
		item: CollabCall,
		raw: RawPayload,
		started: boolean,
	): ReadonlyArray<AgentEvent> => {
		for (const receiver of item.receiverThreadIds) {
			claims.claim(rootThreadId, receiver);
			spawnCalls.set(receiver, item.id);
		}
		return collabEvents(item, raw, started);
	};
	const activity = (
		item: SubAgentActivity,
		threadId: string,
		raw: RawPayload,
	): ReadonlyArray<AgentEvent> => {
		claims.claim(rootThreadId, item.agentThreadId);
		const node = item.agentThreadId;
		if (item.kind === "interrupted") {
			return once(`ended/${node}`)
				? [interrupted(item, raw)]
				: [{ raw, type: "raw" }];
		}
		return item.kind === "interacted" || !once(`opened/${node}`)
			? [{ raw, type: "raw" }]
			: [announced(item, threadId, spawnCalls.get(node) ?? item.id, raw)];
	};
	const lifecycle = (
		notification: RpcNotification,
		threadId: string,
	): ReadonlyArray<AgentEvent> | undefined => {
		const decoded = decodeItem(notification.params);
		if (Option.isNone(decoded)) {
			return undefined;
		}
		const item = subAgentItem(decoded.value.item);
		if (item === undefined) {
			return undefined;
		}
		const raw = rawOf(notification.method, notification.params);
		return item.type === "collabAgentToolCall"
			? collab(item, raw, notification.method === "item/started")
			: activity(item, threadId, raw);
	};
	// why: a thread codex has closed said no word for how its work ended, and a
	// node left open forever reads worse than an honest unknown.
	const closed = (
		threadId: string,
		params: unknown,
	): ReadonlyArray<AgentEvent> => {
		const raw = rawOf("thread/closed", params);
		return once(`ended/${threadId}`)
			? [closedWithoutWord(threadId, raw)]
			: [{ raw, type: "raw" }];
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
