import { bind, landArtifactSpec, landReportSpec } from "@antumbra/agent-tools";
import { Artifacts } from "@antumbra/artifacts";
import type { DirectTool } from "@antumbra/plugin-api";
import { Reports } from "@antumbra/reports";
import { Effect } from "effect";
import { boardTools } from "#board-tools.ts";
import { makeChangeToolCompiler } from "#change-tools.ts";
import type { AgentDeps } from "#deps.ts";
import { standDownTool } from "#stand-down.ts";
import { answered, onPiece } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

// why: the set is the whole of what a worker may do to the record — land
// outcomes, propose changes, write boards, end its session. Nothing here
// charters work, and that is the anti-proposer rule: it is enforced by the
// set, not by asking.
export const makeCrewToolCompiler = Effect.gen(function* () {
	const artifacts = yield* Artifacts;
	const compileChangeTools = yield* makeChangeToolCompiler;
	const reports = yield* Reports;
	function crewTools(
		deps: AgentDeps,
		identity: SessionIdentity,
	): ReadonlyArray<DirectTool> {
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
			bind(landArtifactSpec, (input) =>
				onPiece(identity, (pieceId) =>
					answered(
						identity,
						landArtifactSpec.name,
						artifacts.land({
							authorAgentId: identity.agentId,
							pieceId,
							title: input.title,
							uri: input.uri,
						}),
						() => "artifact landed",
					),
				),
			),
			...compileChangeTools(deps, identity),
			...boardTools(deps, identity),
			standDownTool(deps, identity),
		];
	}
	return crewTools;
});
