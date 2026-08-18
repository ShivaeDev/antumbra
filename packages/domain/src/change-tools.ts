import {
	adoptChangeSpec,
	bind,
	openChangeSpec,
	submitChangeSpec,
} from "@antumbra/agent-tools";
import { type ChangeRow, Changes } from "@antumbra/changes";
import type { DirectTool } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { answered, onPiece } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

// why: the stage is said back rather than assumed — a change that was opened
// reads open, and one adopted after it already landed says so instead of
// telling the agent to wait for something that has happened.
const said = (row: ChangeRow): string =>
	`change ${row.stage}: ${row.url ?? "no url"} (id ${row.id})`;

export const makeChangeToolCompiler = Effect.gen(function* () {
	const submissions = yield* Changes;
	function changeTools(identity: SessionIdentity): ReadonlyArray<DirectTool> {
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
					submissions.adopt({
						agentId: identity.agentId,
						pieceId,
						repoName: input.repo,
						url: input.url,
					}),
					said,
				),
			),
		);
		return [submit, open, adopt];
	}
	return changeTools;
});
