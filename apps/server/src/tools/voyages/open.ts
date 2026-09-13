import { resolve } from "@antumbra/domain-role-settings/queries/resolve.ts";
import { open } from "@antumbra/domain-voyages/commands/open.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { answered, refused } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { AGENT_BACKEND_TAGS, AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Schema } from "effect";
import { resolvedPart } from "#tools/voyages/role.ts";
import { openVoyageSpec } from "#tools/voyages/specs.ts";

const isBackend = Schema.is(AgentBackendTagSchema);

export const openVoyage = bind(openVoyageSpec, (context, input) => {
	const captainBackend = input.captainBackend ?? null;
	const crewBackend = input.crewBackend ?? null;
	if (captainBackend !== null && !isBackend(captainBackend))
		return Effect.succeed(
			refused(`${openVoyageSpec.name}: the fleet has no backend named ${captainBackend} — it names ${AGENT_BACKEND_TAGS.join(", ")}`),
		);
	if (crewBackend !== null && !isBackend(crewBackend))
		return Effect.succeed(
			refused(`${openVoyageSpec.name}: the fleet has no backend named ${crewBackend} — it names ${AGENT_BACKEND_TAGS.join(", ")}`),
		);
	return answered(
		context,
		openVoyageSpec.name,
		Effect.gen(function* () {
			const commit = yield* Commit;
			const live = yield* Live;
			const request = requestId(context);
			yield* commit
				.commit(open, {
					name: input.name,
					northStar: input.northStar,
					context: input.context,
					kind: "voyage",
					requestId: request,
					captainBackend,
					captainModel: input.captainModel ?? null,
					captainEffort: input.captainEffort ?? null,
					crewBackend,
					crewModel: input.crewModel ?? null,
					crewEffort: input.crewEffort ?? null,
				})
				.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq)));
			const voyageId = VoyageId.make(request);
			return {
				id: voyageId,
				captain: yield* live.read(resolve, { voyageId, role: "captain" }),
				crew: yield* live.read(resolve, { voyageId, role: "crew" }),
			};
		}),
		(voyage) => [`opened voyage ${voyage.id}`, resolvedPart("captain", voyage.captain), resolvedPart("crew", voyage.crew)].join(" · "),
	);
});
