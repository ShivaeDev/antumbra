import {
	adoptChangeSpec,
	bind,
	openChangeSpec,
	submitChangeSpec,
} from "@antumbra/agent-tools";
import { Pieces } from "@antumbra/pieces";
import type { DirectTool } from "@antumbra/plugin-api";
import { Effect } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import { ChangeSubmissions } from "#change-submissions/change-submissions.ts";
import { adoptChange } from "#changes.ts";
import type { AgentDeps } from "#deps.ts";
import { answered, onPiece } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

// why: the stage is said back rather than assumed — a change that was opened
// reads open, and one adopted after it already landed says so instead of
// telling the agent to wait for something that has happened.
const said = (row: ChangeRow): string =>
	`change ${row.stage}: ${row.url ?? "no url"} (id ${row.id})`;

export const makeChangeToolCompiler = Effect.gen(function* () {
	const submissions = yield* ChangeSubmissions;
	const pieces = yield* Pieces;
	const providePieces = <A, E>(effect: Effect.Effect<A, E, Pieces>) =>
		effect.pipe(Effect.provideService(Pieces, pieces));
	function changeTools(
		deps: AgentDeps,
		identity: SessionIdentity,
	): ReadonlyArray<DirectTool> {
		const open = bind(openChangeSpec, (input) =>
			onPiece(identity, (pieceId) =>
				answered(
					identity,
					openChangeSpec.name,
					submissions.open({
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
		);
		const submit = bind(submitChangeSpec, (input) =>
			onPiece(identity, (pieceId) =>
				answered(
					identity,
					submitChangeSpec.name,
					submissions.submit({
						agentId: identity.agentId,
						pieceId,
						repoName: input.repo,
					}),
					said,
				),
			),
		);
		const adopt = bind(adoptChangeSpec, (input) =>
			onPiece(identity, (pieceId) =>
				answered(
					identity,
					adoptChangeSpec.name,
					providePieces(
						adoptChange(deps, {
							agentId: identity.agentId,
							pieceId,
							repoName: input.repo,
							url: input.url,
						}),
					),
					said,
				),
			),
		);
		return [submit, open, adopt];
	}
	return changeTools;
});
