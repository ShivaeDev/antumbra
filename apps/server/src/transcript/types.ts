import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";

export interface SessionEvent {
	readonly seq: number;
	readonly event: AgentEvent;
}
export interface SessionTreeNode {
	readonly id: string;
	readonly nativeRef: string | null;
	readonly displayName: string;
	readonly depth: number;
	readonly status: typeof session.Row.Type.status;
}
