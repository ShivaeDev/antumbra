import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Artifacts } from "@antumbra/server-artifacts/service.ts";
import { Effect } from "effect";
import { removeArtifactSupersessionSpec, supersedeArtifactSpec } from "#tools/artifacts/specs.ts";
export const supersedeArtifactTool = bind(supersedeArtifactSpec, (context, input) =>
	answered(
		context,
		supersedeArtifactSpec.name,
		Artifacts.use((service) =>
			service.supersede({
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
		Artifacts.use((service) =>
			service.removeSupersession({
				requestId: requestId(context),
				actorAgentId: context.agentId,
				supersededArtifactId: ArtifactId.make(input.supersededArtifactId),
				successorArtifactId: ArtifactId.make(input.successorArtifactId),
			}),
		).pipe(Effect.catchTag("AlreadyDone", () => Effect.void)),
		() => "artifact supersession removed",
	),
);
