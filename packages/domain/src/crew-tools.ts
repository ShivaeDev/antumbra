import { bind, landArtifactSpec, landReportSpec } from "@antumbra/agent-tools";
import { Artifacts } from "@antumbra/artifacts";
import type { DirectTool } from "@antumbra/plugin-api";
import { Reports } from "@antumbra/reports";
import { Effect } from "effect";
import { makeBoardToolCompiler } from "#board-tools.ts";
import { makeChangeToolCompiler } from "#change-tools.ts";
import { StandDown } from "#stand-down.ts";
import { answered, onPiece } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

// why: the set is the whole of what a worker may do to the record — land
// outcomes, propose changes, write boards, end its session. Nothing here
// charters work, and that is the anti-proposer rule: it is enforced by the
// set, not by asking.
export const makeCrewToolCompiler = Effect.gen(function* () {
	const artifacts = yield* Artifacts;
	const compileBoardTools = yield* makeBoardToolCompiler;
	const compileChangeTools = yield* makeChangeToolCompiler;
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
			...compileChangeTools(identity),
			...compileBoardTools(identity),
			standDown.tool(identity),
		];
	}
	return crewTools;
});
