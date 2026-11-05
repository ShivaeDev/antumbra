import { AGENT_BACKEND_TAGS } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Backends } from "@antumbra/server-backends/service.ts";
import { Repos } from "@antumbra/server-repos/service.ts";
import { RoleSettings } from "@antumbra/server-role-settings/service.ts";
import { Voyages } from "@antumbra/server-voyages/service.ts";
import { Effect } from "effect";

export const readFleetView = Effect.fn("VoyageTools.readFleet")(function* () {
	const voyagesService = yield* Voyages;
	const reposService = yield* Repos;
	const roleSettingsService = yield* RoleSettings;
	const backendsService = yield* Backends;

	const voyages = yield* Effect.forEach(yield* voyagesService.list().pipe(Effect.orDie), (voyage) =>
		Effect.gen(function* () {
			const voyagesService = yield* Voyages;
			const agentsService = yield* Agents;
			const roleSettingsService = yield* RoleSettings;

			return {
				...voyage,
				progress: yield* voyagesService.progress({ id: voyage.id }).pipe(Effect.orDie),
				captain: yield* agentsService.captain({ voyageId: voyage.id }).pipe(Effect.orDie),
				roles: yield* roleSettingsService.forVoyage({ voyageId: voyage.id }).pipe(Effect.orDie),
			};
		}),
	);
	return {
		voyages,
		repos: yield* reposService.all({}).pipe(Effect.orDie),
		roles: yield* roleSettingsService.defaults({}).pipe(Effect.orDie),
		backends: yield* Effect.forEach(AGENT_BACKEND_TAGS, (backend) =>
			Effect.map(backendsService.models({ backend }).pipe(Effect.orDie), (models) => ({ tag: backend, models })),
		),
	};
});

export type FleetReading = Effect.Success<ReturnType<typeof readFleetView>>;
