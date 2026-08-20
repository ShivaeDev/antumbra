import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { repairSubagents } from "#adapters/subagent-repair.ts";
import type { Delivery } from "#session-lanes.ts";

export interface RawEventListener {
	readonly deliver: (delivery: Delivery) => void;
	readonly end: () => void;
	// why: the census names every delegated agent this session ever had, most of
	// which the stream already delivered. The consumer holds that record, so it
	// says what it has and only the rest is read back off disk.
	readonly recorded: (agentId: string) => boolean;
}

export interface SessionDeliveries {
	readonly deliver: (delivery: Delivery) => void;
	readonly finish: () => void;
	readonly frame: (message: SDKMessage) => void;
	readonly repair: (cwd: string) => Promise<void>;
	readonly stop: () => void;
	readonly subscribe: (listener: RawEventListener) => void;
}

const nativeRefOf = (message: SDKMessage): string | undefined =>
	message.type === "system" && message.subtype === "init"
		? message.session_id
		: undefined;

// why: deliveries reach consumers by push, never by awaiting the SDK iterator —
// a consumer waiting on the SDK's own promise cannot be shut down while the
// model is idle, which deadlocked session teardown. Ending is a signal, and
// whatever the provider said before anyone subscribed is held until it can be
// said in order.
export const openSessionDeliveries = (): SessionDeliveries => {
	const pending: Delivery[] = [];
	let listener: RawEventListener | null = null;
	let nativeSessionId: string | undefined;
	let ended = false;
	let stopped = false;
	const deliver = (delivery: Delivery): void => {
		if (listener === null) {
			pending.push(delivery);
			return;
		}
		listener.deliver(delivery);
	};
	// why: the census runs when the provider has stopped talking of its own
	// accord, because only then is the stored transcript final and only then can
	// the consumer say which agents it never heard from. A session torn down by
	// the host is not that moment: nothing there is finished, and reading disk
	// while the app exits would hold up a repair it could not trust anyway.
	const repair = async (cwd: string): Promise<void> => {
		if (stopped || listener === null || nativeSessionId === undefined) {
			return;
		}
		const found = await repairSubagents({
			cwd,
			nativeSessionId,
			recorded: listener.recorded,
		});
		deliver({ kind: "repair", repair: found });
	};
	return {
		deliver,
		finish: () => {
			if (ended) {
				return;
			}
			ended = true;
			listener?.end();
		},
		frame: (message) => {
			nativeSessionId = nativeRefOf(message) ?? nativeSessionId;
			deliver({ kind: "frame", message });
		},
		repair,
		stop: () => {
			stopped = true;
		},
		subscribe: (next) => {
			listener = next;
			for (const delivery of pending.splice(0)) {
				next.deliver(delivery);
			}
			if (ended) {
				next.end();
			}
		},
	};
};
