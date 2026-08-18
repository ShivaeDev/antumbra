import { Database, Writer } from "@antumbra/persistence";
import { Effect } from "effect";
import type { HeldResourceRead } from "#held-resource-read.ts";
import {
	type ClaimedBerth,
	selectResourceReclaimBerths,
} from "#resource-reclaim-selection.ts";
import { readResourceReclaimState } from "#resource-reclaim-state.ts";

export type { ClaimedBerth } from "#resource-reclaim-selection.ts";

export const claimReclaimableBerths = <E>(
	heldResourceRead: HeldResourceRead<E>,
	runnerTags: ReadonlySet<string>,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		return yield* writer.write(
			Effect.gen(function* () {
				const state = yield* readResourceReclaimState(heldResourceRead);
				const selection = yield* selectResourceReclaimBerths(state, runnerTags);
				const selected: Array<ClaimedBerth> = [];
				for (const { berth, needsClaim } of selection) {
					if (needsClaim) {
						yield* db.Moorage.where({ agentId: berth.agentId }).update({
							reclaimState: "claimed",
						});
						yield* db.Berth.where({ id: berth.id }).update({
							reclaimState: "claimed",
						});
					}
					selected.push(berth);
				}
				return selected;
			}),
		);
	});
