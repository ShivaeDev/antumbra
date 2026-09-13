import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
import type { Origin } from "@antumbra/platform-vocabulary/session-events/origin.ts";
import type { RawPayload } from "@antumbra/platform-vocabulary/session-events/raw.ts";
import { Option, Schema } from "effect";
import { rawOf, toAgentEvents } from "#mapping.ts";
import { ItemNotification, SpawnedThread, ThreadScoped, ThreadSettingsUpdatedNotification } from "#protocol.ts";
import type { RpcNotification } from "#rpc.ts";
import { announced, type CollabCall, closedWithoutWord, collabEvents, interrupted, type SubAgentActivity, subAgentItem } from "#subagent-items.ts";
import type { ThreadClaims } from "#thread-claims.ts";
import { attributed } from "#thread-origin.ts";

const decodeScoped = Schema.decodeUnknownOption(ThreadScoped);
const decodeSpawned = Schema.decodeUnknownOption(SpawnedThread);
const decodeItem = Schema.decodeUnknownOption(ItemNotification);
const decodeSettings = Schema.decodeUnknownOption(ThreadSettingsUpdatedNotification);

export interface ThreadTree {
	readonly events: (notification: RpcNotification) => ReadonlyArray<AgentEvent>;
}

// Codex broadcasts all thread frames on one connection; passive census uses a separate connection.
export const openThreadTree = (rootThreadId: string, claims: ThreadClaims, sessionModel: string): ThreadTree => {
	const spawnCalls = new Map<string, string>();
	const stated = new Set<string>();
	const billing = new Map<string, string>();
	const owns = (threadId: string): boolean => threadId === rootThreadId || claims.ownerOf(threadId) === rootThreadId;
	const billedOn = (threadId: string): string => billing.get(threadId) ?? sessionModel;
	// A thread spends on what the thread that spawned it was spending on, until something names a model for it.
	const claimed = (parent: string, child: string): void => {
		claims.claim(rootThreadId, child);
		if (!billing.has(child)) {
			billing.set(child, billedOn(parent));
		}
	};
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
		const parent = source.subAgent.thread_spawn.parent_thread_id;
		if (owns(parent)) {
			claimed(parent, id);
		}
		return [];
	};
	const collab = (item: CollabCall, threadId: string, raw: RawPayload, started: boolean): ReadonlyArray<AgentEvent> => {
		for (const receiver of item.receiverThreadIds) {
			claimed(threadId, receiver);
			spawnCalls.set(receiver, item.id);
		}
		return collabEvents(item, raw, started);
	};
	const activity = (item: SubAgentActivity, threadId: string, raw: RawPayload): ReadonlyArray<AgentEvent> => {
		claimed(threadId, item.agentThreadId);
		const node = item.agentThreadId;
		if (item.kind === "interrupted") {
			return once(`ended/${node}`) ? [interrupted(item, raw)] : [{ raw, type: "raw" }];
		}
		return item.kind !== "started" || !once(`opened/${node}`)
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
		return item.type === "collabAgentToolCall" ? collab(item, threadId, raw, notification.method === "item/started") : activity(item, threadId, raw);
	};
	const closed = (threadId: string, params: unknown): ReadonlyArray<AgentEvent> => {
		const raw = rawOf("thread/closed", params);
		return once(`ended/${threadId}`) ? [closedWithoutWord(threadId, raw)] : [{ raw, type: "raw" }];
	};
	const mapped = (notification: RpcNotification, threadId: string, root: boolean): ReadonlyArray<AgentEvent> =>
		!root && notification.method === "thread/closed"
			? closed(threadId, notification.params)
			: (lifecycle(notification, threadId) ?? toAgentEvents(notification, billedOn(threadId)));
	const rebill = (threadId: string, events: ReadonlyArray<AgentEvent>): void => {
		for (const event of events) {
			if (event.type === "model.rerouted") {
				billing.set(threadId, event.model);
			}
		}
	};
	const settled = (notification: RpcNotification, threadId: string): void => {
		if (notification.method !== "thread/settings/updated") {
			return;
		}
		const settings = decodeSettings(notification.params);
		if (Option.isSome(settings)) {
			billing.set(threadId, settings.value.threadSettings.model);
		}
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
		const root = threadId === rootThreadId;
		settled(notification, threadId);
		const found = mapped(notification, threadId, root);
		rebill(threadId, found);
		if (root) {
			return found;
		}
		const origin: Origin = {
			node: threadId,
			spawnedBy: spawnCalls.get(threadId) ?? threadId,
		};
		return found.map((event) => attributed(event, origin));
	};
	return { events };
};
