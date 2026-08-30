import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { selectResourceReclaimBerths } from "#resource-reclaim-selection.ts";
import { readResourceReclaimState } from "#resource-reclaim-state.ts";

export type { ClaimedBerth } from "#resource-reclaim-selection.ts";

const claimSelectedBerth = (selection: Effect.Success<ReturnType<typeof selectResourceReclaimBerths>>[number]) =>
	Effect.gen(function* () {
		if (!selection.needsClaim) {
			return;
		}
		const db = yield* Database;
		yield* db.Berth.where({ id: selection.berth.id }).update({
			reclaimState: "claimed",
		});
	});

const claimAgentBerths = (agentId: string, runnerTags: ReadonlySet<string>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const state = yield* readResourceReclaimState;
		const selection = (yield* selectResourceReclaimBerths(state, runnerTags)).filter(({ berth }) => berth.agentId === agentId);
		if (selection.some(({ needsClaim }) => needsClaim)) {
			yield* db.Moorage.where({ agentId }).update({
				reclaimState: "claimed",
			});
			yield* Effect.forEach(selection, claimSelectedBerth, { discard: true });
		}
		return selection.map(({ berth }) => berth);
	});

export const claimReclaimableBerths = (runnerTags: ReadonlySet<string>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const state = yield* readResourceReclaimState;
		const selection = yield* selectResourceReclaimBerths(state, runnerTags);
		const agentIds = new Set(selection.map(({ berth }) => berth.agentId));
		const claimed = yield* Effect.forEach(agentIds, (agentId) => db.transaction(claimAgentBerths(agentId, runnerTags)));
		return claimed.flat();
	});
