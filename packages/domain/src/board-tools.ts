import { bind, markReadSpec, readBoardSpec, readMailSpec, writeBoardSpec } from "@antumbra/agent-tools";
import { type BoardEntryRow, type BoardScope, Boards, EntryInput } from "@antumbra/boards";
import type { DirectTool, DirectToolOutcome } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import { type BoardScopeName, resolveBoardScope } from "#board-scope-resolution.ts";
import { renderMail } from "#mail-render.ts";
import { answered, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

const withScope = (identity: SessionIdentity, name: BoardScopeName, act: (scope: BoardScope) => Effect.Effect<DirectToolOutcome>) =>
	Option.match(resolveBoardScope(identity, name), {
		onNone: () => Effect.succeed(refused(`you have no ${name} board`)),
		onSome: act,
	});

const rendered = (entries: ReadonlyArray<BoardEntryRow>): string =>
	entries.length === 0 ? "the board is empty" : entries.map((entry) => `[${entry.register}] ${entry.body}`).join("\n");

export const makeBoardToolCompiler = Effect.gen(function* () {
	const boards = yield* Boards;
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(readMailSpec, () => answered(identity, readMailSpec.name, boards.unread(identity.agentId), renderMail)),
		bind(markReadSpec, (input) => answered(identity, markReadSpec.name, boards.markRead(identity.agentId, input.entryIds), () => "marked read")),
		bind(writeBoardSpec, (input) =>
			withScope(identity, input.scope, (scope) =>
				answered(
					identity,
					writeBoardSpec.name,
					boards.write(
						scope,
						EntryInput.Note({
							authorAgentId: Option.some(identity.agentId),
							body: input.body,
							register: input.register,
						}),
					),
					() => `written to the ${input.scope} board`,
				),
			),
		),
		bind(readBoardSpec, (input) => withScope(identity, input.scope, (scope) => answered(identity, readBoardSpec.name, boards.read(scope), rendered))),
	];
});
