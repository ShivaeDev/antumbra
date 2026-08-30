import type { StoredAgentSession } from "@antumbra/persistence";
import { decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Result } from "effect";

export interface Spawner {
	readonly currentSessionId: string | null;
	readonly id: string;
	readonly status: unknown;
}

// why: an Agent whose status cannot be decoded is not thereby dead. Liveness is
// only ever decided against, so anything unreadable reads as still alive and the
// node it might own is left open.
const alive = (spawner: Spawner): boolean => {
	const status = decodeStoredAgentStatus(spawner.id, spawner.status);
	return Result.isFailure(status) || status.success === "alive";
};

// why: the predicate. A node dies with its acquisition, and its acquisition is
// the root's stream — so a node is provably gone only when its root can never
// carry one again. A closed root is resumable exactly when it is the current
// Session of a living Agent, which is the same rule a wake itself applies; a
// root that is still open, or that a wake could still take, leaves its nodes
// undecidable and therefore untouched. Backgrounded work outliving a turn and
// children re-driven across activations are why this is never inferred from
// silence.
export const acquisitionGone = (
	root: StoredAgentSession | undefined,
	spawner: Spawner | undefined,
): boolean => {
	if (root === undefined || root.status !== "closed") {
		return false;
	}
	return (
		spawner === undefined ||
		!alive(spawner) ||
		spawner.currentSessionId !== root.id
	);
};
