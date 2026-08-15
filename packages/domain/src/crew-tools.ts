import { bind, landArtifactSpec, landReportSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { boardTools } from "#board-tools.ts";
import { changeTools } from "#change-tools.ts";
import type { AgentDeps } from "#deps.ts";
import { landArtifact, landReport } from "#outcomes.ts";
import { standDownTool } from "#stand-down.ts";
import { answered, onPiece } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

// why: the set is the whole of what a worker may do to the record — land
// outcomes, propose changes, write boards, end its session. Nothing here
// charters work, and that is the anti-proposer rule: it is enforced by the
// set, not by asking.
export const crewTools = (
	deps: AgentDeps,
	identity: SessionIdentity,
): ReadonlyArray<DirectTool> => [
	bind(landReportSpec, (input) =>
		onPiece(identity, (pieceId) =>
			answered(
				identity,
				landReportSpec.name,
				landReport(deps, {
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
				landArtifact(deps, {
					authorAgentId: identity.agentId,
					pieceId,
					title: input.title,
					uri: input.uri,
				}),
				() => "artifact landed",
			),
		),
	),
	...changeTools(deps, identity),
	...boardTools(deps, identity),
	standDownTool(deps, identity),
];
