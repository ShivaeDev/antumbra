import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { selectResourceReclaimBerths } from "#resource-reclaim-selection.ts";
import { readResourceReclaimState } from "#resource-reclaim-state.ts";

export type { ClaimedBerth } from "#resource-reclaim-selection.ts";

const claimSelectedBerth = (selection: ReturnType<typeof selectResourceReclaimBerths>[number]) =>
	Effect.gen(function* () {
		if (!selection.needsClaim) {
			return;
		}
		const db = yield* Database;
		yield* db.Berth.where({ id: selection.berth.id }).update({
			reclaimState: "claimed",
		});
	});

export const claimReclaimableBerths = (runnerTags: ReadonlySet<string>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const state = yield* readResourceReclaimState;
		const selection = selectResourceReclaimBerths(state, runnerTags);
		const newlyClaimed = selection.filter(({ needsClaim }) => needsClaim);
		const agentIds = new Set(newlyClaimed.map(({ berth }) => berth.agentId));
		yield* Effect.forEach(agentIds, (agentId) => db.Moorage.where({ agentId }).update({ reclaimState: "claimed" }), { discard: true });
		yield* Effect.forEach(newlyClaimed, claimSelectedBerth, { discard: true });
		return selection.map(({ berth }) => berth);
	});
