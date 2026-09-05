import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { selectResourceReclaimBerths } from "#resource-reclaim-selection.ts";
import { readResourceReclaimState } from "#resource-reclaim-state.ts";

export type { ClaimedBerth } from "#resource-reclaim-selection.ts";

export const claimReclaimableBerths = Effect.fn("ResourceReclamation.claimReclaimableBerths")(function* (runnerTags: ReadonlySet<string>) {
	const db = yield* Database;
	const state = yield* readResourceReclaimState;
	const selection = selectResourceReclaimBerths(state, runnerTags);
	const newlyClaimed = selection.filter(({ needsClaim }) => needsClaim);
	const agentIds = new Set(newlyClaimed.map(({ berth }) => berth.agentId));
	yield* Effect.forEach(agentIds, (agentId) => db.Moorage.where({ agentId }).update({ reclaimState: "claimed" }), { discard: true });
	yield* Effect.forEach(newlyClaimed, ({ berth }) => db.Berth.where({ id: berth.id }).update({ reclaimState: "claimed" }), { discard: true });
	return selection.map(({ berth }) => berth);
});
