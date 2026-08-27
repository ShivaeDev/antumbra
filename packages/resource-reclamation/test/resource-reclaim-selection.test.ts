import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { selectResourceReclaimBerths } from "#resource-reclaim-selection.ts";
import type { ResourceReclaimSnapshot } from "#resource-reclaim-state.ts";

const claimedBy = (status: "alive" | "spawning"): ResourceReclaimSnapshot => ({
	agents: [{ agentId: "agent-active", status }],
	berths: [
		{
			agentId: "agent-active",
			branch: "work/agent-active/berth-0",
			id: "agent-active:berth-0",
			path: "/tmp/moorage/agent-active/berth-0",
			reclaimState: "claimed",
			runner: "local",
			slug: "berth-0",
			source: "/tmp/repo",
			status: "ready",
			strandedAt: null,
		},
	],
	held: new Map(),
	moorages: [
		{
			agentId: "agent-active",
			reclaimState: "claimed",
			runner: "local",
			status: "ready",
		},
	],
	sessions: [],
});

it.effect("refuses a durable reclaim claim owned by an active Agent", () =>
	Effect.forEach(["alive", "spawning"] as const, (status) =>
		selectResourceReclaimBerths(claimedBy(status), new Set(["local"])).pipe(
			Effect.flip,
			Effect.map((failure) => {
				expect(failure).toMatchObject({
					_tag: "ResourceReclaimClaimInvalid",
					agentId: "agent-active",
				});
				return undefined;
			}),
		),
	),
);
