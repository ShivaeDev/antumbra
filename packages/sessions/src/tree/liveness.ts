import type { StoredAgentSession } from "@antumbra/persistence";
import { decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Result } from "effect";

export interface Spawner {
	readonly currentSessionId: string | null;
	readonly id: string;
	readonly status: unknown;
}

const alive = (spawner: Spawner): boolean => {
	const status = decodeStoredAgentStatus(spawner.id, spawner.status);
	return Result.isFailure(status) || status.success === "alive";
};

// A child is provably gone only after its root closes and no living Agent can resume it.
export const acquisitionGone = (root: StoredAgentSession | undefined, spawner: Spawner | undefined): boolean => {
	if (root === undefined || root.status !== "closed") {
		return false;
	}
	return spawner === undefined || !alive(spawner) || spawner.currentSessionId !== root.id;
};
