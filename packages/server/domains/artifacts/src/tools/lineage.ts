import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";
import { removeSupersession } from "#commands/remove-supersession.ts";
import { supersede } from "#commands/supersede.ts";
import { ArtifactId } from "#ids.ts";
import { removeArtifactSupersessionSpec, supersedeArtifactSpec } from "#tools/specs.ts";
export const supersedeArtifactTool = bind(supersedeArtifactSpec, (context, input) =>
	answered(
		context,
		supersedeArtifactSpec.name,
		Effect.flatMap(Commit, (commit) =>
			commit.commit(supersede, {
				requestId: Request.make(context.callId),
				actorAgentId: context.agentId,
				supersededArtifactId: ArtifactId.make(input.supersededArtifactId),
				successorArtifactId: ArtifactId.make(input.successorArtifactId),
			}),
		).pipe(Effect.catchTag("AlreadyDone", () => Effect.void)),
		() => "artifact supersession recorded",
	),
);
export const removeArtifactSupersessionTool = bind(removeArtifactSupersessionSpec, (context, input) =>
	answered(
		context,
		removeArtifactSupersessionSpec.name,
		Effect.flatMap(Commit, (commit) =>
			commit.commit(removeSupersession, {
				requestId: Request.make(context.callId),
				actorAgentId: context.agentId,
				supersededArtifactId: ArtifactId.make(input.supersededArtifactId),
				successorArtifactId: ArtifactId.make(input.successorArtifactId),
			}),
		).pipe(Effect.catchTag("AlreadyDone", () => Effect.void)),
		() => "artifact supersession removed",
	),
);
