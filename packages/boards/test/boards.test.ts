import { Boards, BoardsLive } from "@antumbra/boards";
import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { persistenceIt } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Effect, Layer, Option, PubSub } from "effect";

const it = persistenceIt();
const layer = BoardsLive.pipe(Layer.provideMerge(DomainFeedsLive));

it.effectDB(
	"owns replay-safe pull mail and explicit read receipts",
	function* (db) {
		yield* Effect.scoped(
			Effect.gen(function* () {
				const boards = yield* Boards;
				const feeds = yield* DomainFeeds;
				const notices = yield* PubSub.subscribe(feeds.voyages);
				yield* db.Agent.create({
					charter: "take in selected mail",
					id: "agent-mailbox",
					role: "hand",
					status: "alive",
				});
				const input = {
					authorAgentId: Option.none<string>(),
					body: "the admiral selected this for attention",
					precedence: "priority" as const,
					sourceRef: "selection:attention-1",
					toAgentId: "agent-mailbox",
				};
				const first = yield* boards.mail(input);
				const replay = yield* boards.mail(input);

				expect(replay.id).toBe(first.id);
				expect(yield* db.BoardEntry.all()).toHaveLength(1);
				expect(
					(yield* boards.unread(input.toAgentId)).map((row) => row.id),
				).toEqual([first.id]);
				expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);

				yield* boards.markRead(input.toAgentId, [first.id]);
				expect(yield* boards.unread(input.toAgentId)).toEqual([]);
				expect(yield* db.BoardEntryReceipt.all()).toMatchObject([
					{ entryId: first.id },
				]);
			}),
		).pipe(Effect.provide(layer));
	},
);
