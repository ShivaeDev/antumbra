import { adoptChangeSpec, bind, openChangeSpec, submitChangeSpec } from "@antumbra/agent-tools";
import { type ChangeRow, Changes } from "@antumbra/changes";
import { Effect } from "effect";
import { answered, onPiece } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

const said = (row: ChangeRow): string => `change ${row.stage}: ${row.url ?? "no url"} (id ${row.id})`;

export const compileChangeTools = Effect.fn("AgentToolCompiler.compileChangeTools")(function* (identity: SessionIdentity) {
	const submissions = yield* Changes;
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
					sessionId: identity.sessionId,
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
					sessionId: identity.sessionId,
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
});
