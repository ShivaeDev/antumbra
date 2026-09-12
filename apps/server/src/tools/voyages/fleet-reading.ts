import { captain } from "@antumbra/domain-agents/queries/captain.ts";
import { models } from "@antumbra/domain-backends/queries/models.ts";
import { all as repos } from "@antumbra/domain-repos/queries/all.ts";
import { defaults } from "@antumbra/domain-role-settings/queries/defaults.ts";
import { forVoyage } from "@antumbra/domain-role-settings/queries/for-voyage.ts";
import { list } from "@antumbra/domain-voyages/queries/list.ts";
import { progress } from "@antumbra/domain-voyages/queries/progress.ts";
import { AGENT_BACKEND_TAGS } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";

export const readFleetView = Effect.fn("VoyageTools.readFleet")(function* () {
	const live = yield* Live;
	const voyages = yield* Effect.forEach(yield* live.read(list, {}), (voyage) =>
		Effect.gen(function* () {
			return {
				...voyage,
				progress: yield* live.read(progress, { id: voyage.id }),
				captain: yield* live.read(captain, { voyageId: voyage.id }),
				roles: yield* live.read(forVoyage, { voyageId: voyage.id }),
			};
		}),
	);
	return {
		voyages,
		repos: yield* live.read(repos, {}),
		roles: yield* live.read(defaults, {}),
		backends: yield* Effect.forEach(AGENT_BACKEND_TAGS, (backend) =>
			Effect.map(live.read(models, { backend }), (models) => ({ tag: backend, models })),
		),
	};
});

export type FleetReading = Effect.Success<ReturnType<typeof readFleetView>>;
