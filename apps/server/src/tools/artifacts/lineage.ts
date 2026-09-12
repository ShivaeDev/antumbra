import { removeSupersession } from "@antumbra/domain-artifacts/commands/remove-supersession.ts";
import { supersede } from "@antumbra/domain-artifacts/commands/supersede.ts";
import { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";
import { removeArtifactSupersessionSpec, supersedeArtifactSpec } from "#tools/artifacts/specs.ts";
export const supersedeArtifactTool = bind(supersedeArtifactSpec, (context, input) =>
	answered(
		context,
		supersedeArtifactSpec.name,
		Effect.flatMap(Commit, (commit) =>
			commit.commit(supersede, {
				requestId: requestId(context),
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
				requestId: requestId(context),
				actorAgentId: context.agentId,
				supersededArtifactId: ArtifactId.make(input.supersededArtifactId),
				successorArtifactId: ArtifactId.make(input.successorArtifactId),
			}),
		).pipe(Effect.catchTag("AlreadyDone", () => Effect.void)),
		() => "artifact supersession removed",
	),
);
