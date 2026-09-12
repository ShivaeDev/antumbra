import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { landArtifact } from "#acts/land.ts";
import { ArtifactId } from "#ids.ts";
import { landArtifactSpec } from "#tools/specs.ts";
export const landArtifactTool = bind(landArtifactSpec, (context, input) => {
	if (context.pieceId === undefined) return Effect.succeed({ ok: false, text: "you are not on a piece" });
	return answered(
		context,
		landArtifactSpec.name,
		landArtifact({
			requestId: Request.make(context.callId),
			authorAgentId: context.agentId,
			pieceId: PieceId.make(context.pieceId),
			path: input.path,
			title: input.title,
			supersedesArtifactId: input.supersedesArtifactId === undefined ? null : ArtifactId.make(input.supersedesArtifactId),
		}),
		(landing) => {
			if (landing.supersededArtifactId !== null) return `artifact landed and superseded ${landing.supersededArtifactId}`;
			const current = landing.otherCurrentArtifacts.map((artifact) => `${artifact.id} (${artifact.title})`).join(", ");
			return `artifact landed; other current artifacts: ${current === "" ? "none" : current}; call supersede if this is a new version`;
		},
	);
});
