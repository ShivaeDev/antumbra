import { type BoardEntryInput, BoardScope, Boards, type BoardsService } from "@antumbra/boards";
import { mailboxOver } from "@antumbra/boards/mailbox";
import { uncoveredDays, uncoveredSpan } from "@antumbra/boards/summaries";
import type { boards } from "@antumbra/domain-boards/feature.ts";
import { agentBoard, type BoardId, pieceBoard, voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Database } from "@antumbra/persistence";
import type { Api } from "@antumbra/platform-rpc/client.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { type Context, Effect, Layer, Option } from "effect";
import { type BoardRefused, writeRefused } from "#adapters/board-refusals.ts";
import { entryOf } from "#adapters/board-rows.ts";
import { once, ServerReach } from "#adapters/server-reach.ts";

type Reach<Failure> = Api<readonly [typeof boards], Failure>;

type Feeds = Effect.Success<typeof DomainFeeds>;

type Store = Effect.Success<typeof Database>;

const NAMELESS = "";

const boardOf = (scope: BoardScope): BoardId =>
	BoardScope.$match(scope, {
		Agent: ({ agentId }) => agentBoard(agentId),
		Piece: ({ pieceId }) => pieceBoard(PieceId.make(pieceId)),
		Voyage: ({ voyageId }) => voyageBoard(VoyageId.make(voyageId)),
	});

export const boardsOver = <Failure extends BoardRefused>(reach: Reach<Failure>, store: Store, feeds: Feeds): BoardsService => {
	const kept = (scope: BoardScope) => Effect.map(once(reach.boards.entries({ board: boardOf(scope) })), (stored) => stored.map(entryOf));
	const wrote = Effect.fnUntraced(function* (scope: BoardScope, entryId: string) {
		if (scope._tag !== "Agent") {
			yield* feeds.publishVoyageRefresh();
		}
		const written = (yield* kept(scope)).find((entry) => entry.id === entryId);
		return written === undefined ? yield* Effect.die(new Error(`the journal wrote board entry ${entryId} and does not hold it`)) : written;
	});
	return {
		...mailboxOver(store),
		digest: (scope: BoardScope) => Effect.map(once(reach.boards.digest({ board: boardOf(scope) })), (stored) => stored.map(entryOf)),
		read: kept,
		span: (scope: BoardScope) => Effect.map(kept(scope), uncoveredSpan),
		uncovered: (scope: BoardScope) => Effect.map(kept(scope), uncoveredDays),
		under: (scope: BoardScope, summaryId: string) =>
			Effect.map(once(reach.boards.under({ board: boardOf(scope), summaryId })), (stored) => stored.map(entryOf)),
		write: Effect.fn("Boards.write")(function* (scope: BoardScope, input: BoardEntryInput) {
			const board = boardOf(scope);
			const requestId = Id.Request.make(input.id ?? Id.make());
			const author = Option.getOrElse(input.authorAgentId, () => null);
			if (input._tag === "Note") {
				yield* reach.boards.write({ author, board, body: input.body, register: input.register, requestId }).pipe(Effect.catch(writeRefused(scope)));
			} else if (input._tag === "PieceSummary") {
				yield* reach.boards
					.summarizePiece({ author: author ?? NAMELESS, board, body: input.body, pieceId: PieceId.make(input.pieceId), requestId })
					.pipe(Effect.catch(writeRefused(scope)));
			} else {
				yield* reach.boards
					.summarize({
						author: author ?? NAMELESS,
						board,
						body: input.body,
						coversFrom: input.coversFrom,
						coversTo: input.coversTo,
						level: input.level,
						requestId,
					})
					.pipe(Effect.catch(writeRefused(scope)));
			}
			return yield* wrote(scope, requestId);
		}),
	};
};

export const BoardsOverRpc: Layer.Layer<
	Boards,
	never,
	Context.Service.Identifier<typeof Database> | Context.Service.Identifier<typeof DomainFeeds> | ServerReach
> = Layer.effect(Boards)(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const store = yield* Database;
		return boardsOver(yield* ServerReach, store, feeds);
	}),
);
