import type { VoyageWorld } from "#voyage-rows.ts";

// why: an agent is at work from the moment it is being born — a spawning
// agent has no session yet, but what it holds must not be handed out a second
// time while the first spawn is still assembling it. Dormant and retired
// agents release what they held.
const AT_WORK: ReadonlySet<string> = new Set(["alive", "spawning"]);

export const atWork = (world: VoyageWorld, agentId: string): boolean =>
	AT_WORK.has(world.agentStatus.get(agentId) ?? "");
