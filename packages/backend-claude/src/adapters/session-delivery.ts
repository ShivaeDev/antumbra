import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { repairSubagents } from "#adapters/subagent-repair.ts";
import type { Delivery } from "#session-lanes.ts";

export interface RawEventListener {
	readonly deliver: (delivery: Delivery) => void;
	readonly end: () => void;
	readonly recorded: (agentId: string) => boolean;
}

interface SessionDeliveries {
	readonly deliver: (delivery: Delivery) => void;
	readonly finish: () => void;
	readonly frame: (message: SDKMessage) => void;
	readonly repair: (cwd: string) => Promise<void>;
	readonly stop: () => void;
	readonly subscribe: (listener: RawEventListener) => void;
}

const nativeRefOf = (message: SDKMessage): string | undefined =>
	message.type === "system" && message.subtype === "init" ? message.session_id : undefined;

// Push and buffer deliveries instead of awaiting the idle SDK iterator; awaiting
// it previously deadlocked session teardown.
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
	// Repair runs only after natural provider silence, when its transcript is
	// final; `stop` disables it during host teardown.
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
