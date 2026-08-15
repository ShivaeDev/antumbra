import { bind, readBoardSpec, writeBoardSpec } from "@antumbra/agent-tools";
import type { PrismaError } from "@antumbra/persistence";
import type { DirectTool, DirectToolOutcome } from "@antumbra/plugin-api";
import { Effect, Option } from "effect";
import type { BoardScope } from "#board-scope.ts";
import { type BoardEntryRow, readBoard, writeEntry } from "#boards.ts";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { answered, refused } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

type ScopeName = "piece" | "self" | "voyage";

type Resolved = Effect.Effect<Option.Option<BoardScope>, PrismaError>;

// why: crew reach their voyage's board through the piece they answer to —
// membership is the link, so nothing has to be told to a session that the
// rows do not already say.
const voyageScope = (deps: AgentDeps, identity: SessionIdentity): Resolved =>
	Option.match(identity.pieceId, {
		onNone: () => Effect.succeed(Option.none<BoardScope>()),
		onSome: (pieceId) =>
			provideExecutors(deps)(
				deps.db.VoyagePiece.where({ pieceId }).first(),
			).pipe(
				Effect.map((row) =>
					Option.map(
						row,
						(membership): BoardScope => ({
							kind: "voyage",
							voyageId: membership.voyageId,
						}),
					),
				),
			),
	});

const scopeFor = (
	deps: AgentDeps,
	identity: SessionIdentity,
	name: ScopeName,
): Resolved => {
	if (name === "self") {
		return Effect.succeed(
			Option.some<BoardScope>({ agentId: identity.agentId, kind: "agent" }),
		);
	}
	if (name === "piece") {
		return Effect.succeed(
			Option.map(
				identity.pieceId,
				(pieceId): BoardScope => ({ kind: "piece", pieceId }),
			),
		);
	}
	return voyageScope(deps, identity);
};

const withScope = (
	deps: AgentDeps,
	identity: SessionIdentity,
	name: ScopeName,
	act: (scope: BoardScope) => Effect.Effect<DirectToolOutcome>,
): Effect.Effect<DirectToolOutcome> =>
	scopeFor(deps, identity, name).pipe(
		Effect.matchEffect({
			onFailure: () => Effect.succeed(refused("the boards could not be read")),
			onSuccess: (scope) =>
				Option.match(scope, {
					onNone: () => Effect.succeed(refused(`you have no ${name} board`)),
					onSome: act,
				}),
		}),
	);

const rendered = (entries: ReadonlyArray<BoardEntryRow>): string =>
	entries.length === 0
		? "the board is empty"
		: entries.map((entry) => `[${entry.register}] ${entry.body}`).join("\n");

export const boardTools = (
	deps: AgentDeps,
	identity: SessionIdentity,
): ReadonlyArray<DirectTool> => [
	bind(writeBoardSpec, (input) =>
		withScope(deps, identity, input.scope, (scope) =>
			answered(
				identity,
				writeBoardSpec.name,
				writeEntry(deps, scope, {
					authorAgentId: Option.some(identity.agentId),
					body: input.body,
					register: input.register,
				}),
				() => `written to the ${input.scope} board`,
			),
		),
	),
	bind(readBoardSpec, (input) =>
		withScope(deps, identity, input.scope, (scope) =>
			answered(identity, readBoardSpec.name, readBoard(deps, scope), rendered),
		),
	),
];
