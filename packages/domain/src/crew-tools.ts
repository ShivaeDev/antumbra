import {
	bind,
	landArtifactSpec,
	landReportSpec,
	removeArtifactSupersessionSpec,
	supersedeArtifactSpec,
} from "@antumbra/agent-tools";
import {
	type ArtifactInput,
	type ArtifactLanding,
	Artifacts,
} from "@antumbra/artifacts";
import type { DirectTool } from "@antumbra/plugin-api";
import { Reports } from "@antumbra/reports";
import { Effect } from "effect";
import { makeBoardToolCompiler } from "#board-tools.ts";
import { makeChangeToolCompiler } from "#change-tools.ts";
import { makeReportToolCompiler } from "#report-tools.ts";
import { StandDown } from "#stand-down.ts";
import { answered, onPiece } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

const artifactLandingAnswer = (landing: ArtifactLanding): string => {
	if (landing._tag === "superseded") {
		return `artifact landed and superseded ${landing.supersededArtifactId}`;
	}
	const current = landing.otherCurrentArtifacts
		.map((artifact) => `${artifact.id} (${artifact.title})`)
		.join(", ");
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
	return input.supersedesArtifactId === undefined
		? base
		: { ...base, supersedesArtifactId: input.supersedesArtifactId };
};

// why: the set is the whole of what a worker may do to the record — land
// outcomes, propose changes, write boards, end its session. Nothing here
// charters work, and that is the anti-proposer rule: it is enforced by the
// set, not by asking.
export const makeCrewToolCompiler = Effect.gen(function* () {
	const artifacts = yield* Artifacts;
	const compileBoardTools = yield* makeBoardToolCompiler;
	const compileChangeTools = yield* makeChangeToolCompiler;
	const compileReportTools = yield* makeReportToolCompiler;
	const reports = yield* Reports;
	const standDown = yield* StandDown;
	function crewTools(identity: SessionIdentity): ReadonlyArray<DirectTool> {
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
			...compileReportTools(identity),
			bind(landArtifactSpec, (input) =>
				onPiece(identity, (pieceId) =>
					answered(
						identity,
						landArtifactSpec.name,
						artifacts.land(artifactInput(identity, pieceId, input)),
						artifactLandingAnswer,
					),
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
			...compileChangeTools(identity),
			...compileBoardTools(identity),
			standDown.tool(identity),
		];
	}
	return crewTools;
});
