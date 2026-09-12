import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Voyages } from "@antumbra/voyages";
import { Clock, type Context, Effect, Layer, Option, Ref } from "effect";
import { Boards } from "#boards.ts";
import { BoardOwnerNotFound } from "#errors.ts";
import { mailboxOver } from "#mailbox.ts";
import { type BoardEntryInput, BoardScope } from "#model.ts";
import { appended, emptyLog, entriesOn, type Log, ownerOf, writtenRow } from "#scripted.ts";
import { digestOf, entriesUnder, uncoveredDays, uncoveredSpan } from "#summaries.ts";

export type ScriptedLog = Ref.Ref<Log>;

export const scriptedLog = (): ScriptedLog => Ref.makeUnsafe<Log>(emptyLog);

export const scriptedBoardsOn = (
	state: ScriptedLog,
): Layer.Layer<Boards, never, Context.Service.Identifier<typeof Database> | Context.Service.Identifier<typeof DomainFeeds> | Pieces | Voyages> =>
	Layer.effect(Boards)(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const berthed = yield* Pieces;
			const sailing = yield* Voyages;
			const kept = (scope: BoardScope) => Effect.map(Ref.get(state), (log) => entriesOn(log, scope));
			const standing = (scope: BoardScope) =>
				BoardScope.$match(scope, {
					Agent: () => Effect.succeed(true),
					Piece: ({ pieceId }) => Effect.map(berthed.byId(pieceId), Option.isSome),
					Voyage: ({ voyageId }) => Effect.map(sailing.byId(voyageId), Option.isSome),
				});
			return {
				...mailboxOver(yield* Database),
				digest: (scope: BoardScope) => Effect.map(kept(scope), digestOf),
				read: kept,
				span: (scope: BoardScope) => Effect.map(kept(scope), uncoveredSpan),
				uncovered: (scope: BoardScope) => Effect.map(kept(scope), uncoveredDays),
				under: (scope: BoardScope, summaryId: string) => Effect.map(kept(scope), (entries) => entriesUnder(entries, summaryId)),
				write: Effect.fnUntraced(function* (scope: BoardScope, input: BoardEntryInput) {
					if (!(yield* standing(scope))) {
						return yield* new BoardOwnerNotFound(ownerOf(scope));
					}
					const written = yield* kept(scope);
					const row = writtenRow(input, { nowMillis: yield* Clock.currentTimeMillis, seq: written.length + 1 });
					yield* Ref.update(state, (log) => appended(log, scope, row));
					if (scope._tag !== "Agent") {
						yield* feeds.publishVoyageRefresh();
					}
					return row;
				}),
			};
		}),
	);

export const scriptedBoards = Layer.unwrap(Effect.sync(() => scriptedBoardsOn(scriptedLog())));
