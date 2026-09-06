import { bind, landArtifactSpec, landReportSpec, removeArtifactSupersessionSpec, supersedeArtifactSpec } from "@antumbra/agent-tools";
import { type ArtifactInput, type ArtifactLanding, Artifacts } from "@antumbra/artifacts";
import { Reports } from "@antumbra/reports";
import { Effect } from "effect";
import { compileBoardTools } from "#board-tools.ts";
import { compileChangeTools } from "#change-tools.ts";
import { compileReportTools } from "#report-tools.ts";
import { compileRulingReadingTools } from "#ruling-reading-tools.ts";
import { compileRulingTools } from "#ruling-tools.ts";
import { answered, onPiece } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { compileVoyageReadingTools } from "#voyage-reading-tools.ts";

const artifactLandingAnswer = (landing: ArtifactLanding): string => {
	if (landing._tag === "superseded") {
		return `artifact landed and superseded ${landing.supersededArtifactId}`;
	}
	const current = landing.otherCurrentArtifacts.map((artifact) => `${artifact.id} (${artifact.title})`).join(", ");
	return `artifact landed; other current artifacts: ${current === "" ? "none" : current}; call supersede if this is a new version`;
};

const artifactInput = (
	identity: SessionIdentity,
	pieceId: string,
	input: {
		readonly path: string;
		readonly supersedesArtifactId?: string | undefined;
		readonly title: string;
	},
): ArtifactInput => {
	const base = {
		authorAgentId: identity.agentId,
		path: input.path,
		pieceId,
		title: input.title,
	};
	return input.supersedesArtifactId === undefined ? base : { ...base, supersedesArtifactId: input.supersedesArtifactId };
};

export const compileCrewTools = Effect.fn("AgentToolCompiler.compileCrewTools")(function* (identity: SessionIdentity) {
	const artifacts = yield* Artifacts;
	const boardTools = yield* compileBoardTools(identity);
	const changeTools = yield* compileChangeTools(identity);
	const reportTools = yield* compileReportTools(identity);
	const rulingTools = yield* compileRulingTools(identity);
	const rulingReadingTools = yield* compileRulingReadingTools(identity);
	const voyageReadingTools = yield* compileVoyageReadingTools(identity);
	const reports = yield* Reports;
	return [
		bind(landReportSpec, (input) =>
			onPiece(identity, (pieceId) =>
				answered(
					identity,
					landReportSpec.name,
					reports.land({
						authorAgentId: identity.agentId,
						body: input.body,
						pieceId,
						title: input.title,
					}),
					() => "report landed",
				),
			),
		),
		...reportTools,
		bind(landArtifactSpec, (input) =>
			onPiece(identity, (pieceId) =>
				answered(identity, landArtifactSpec.name, artifacts.land(artifactInput(identity, pieceId, input)), artifactLandingAnswer),
			),
		),
		bind(supersedeArtifactSpec, (input) =>
			answered(
				identity,
				supersedeArtifactSpec.name,
				artifacts.supersede({
					actor: { _tag: "agent", agentId: identity.agentId },
					...input,
				}),
				() => "artifact supersession recorded",
			),
		),
		bind(removeArtifactSupersessionSpec, (input) =>
			answered(
				identity,
				removeArtifactSupersessionSpec.name,
				artifacts.removeSupersession({
					actor: { _tag: "agent", agentId: identity.agentId },
					...input,
				}),
				() => "artifact supersession removed",
			),
		),
		...changeTools,
		...voyageReadingTools,
		...boardTools,
		...rulingTools,
		...rulingReadingTools,
	];
});
