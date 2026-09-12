import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { RawEventListener } from "@antumbra/runner-backends-claude/runtime.ts";
import type { Delivery } from "@antumbra/runner-backends-claude/session-lanes.ts";
import { repairSubagents } from "#backends/claude/adapters/subagent-repair.ts";

interface SessionDeliveries {
	readonly deliver: (delivery: Delivery) => void;
	readonly finish: () => void;
	readonly fail: (error: unknown) => void;
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
	let failure: { readonly error: unknown } | undefined;
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
		fail: (error) => {
			if (stopped) return;
			failure = { error };
			listener?.fail(error);
		},
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
			if (failure !== undefined) {
				next.fail(failure.error);
			} else if (ended) {
				next.end();
			}
		},
	};
};
