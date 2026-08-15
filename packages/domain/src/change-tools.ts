import { adoptChangeSpec, bind, openChangeSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import type { ChangeRow } from "#change-rows.ts";
import { adoptChange, openChange } from "#changes.ts";
import type { AgentDeps } from "#deps.ts";
import { answered, onPiece } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

// why: the stage is said back rather than assumed — a change that was opened
// reads open, and one adopted after it already landed says so instead of
// telling the agent to wait for something that has happened.
const said = (row: ChangeRow): string =>
	`change ${row.stage}: ${row.url ?? "no url"} (id ${row.id})`;

export const changeTools = (
	deps: AgentDeps,
	identity: SessionIdentity,
): ReadonlyArray<DirectTool> => [
	bind(openChangeSpec, (input) =>
		onPiece(identity, (pieceId) =>
			answered(
				identity,
				openChangeSpec.name,
				openChange(deps, {
					agentId: identity.agentId,
					base: input.base ?? null,
					body: input.body,
					draft: input.draft ?? false,
					pieceId,
					repoName: input.repo,
					title: input.title,
				}),
				said,
			),
		),
	),
	bind(adoptChangeSpec, (input) =>
		onPiece(identity, (pieceId) =>
			answered(
				identity,
				adoptChangeSpec.name,
				adoptChange(deps, {
					agentId: identity.agentId,
					pieceId,
					repoName: input.repo,
					url: input.url,
				}),
				said,
			),
		),
	),
];
