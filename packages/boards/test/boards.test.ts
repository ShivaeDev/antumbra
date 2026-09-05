import { BoardScope, Boards, BoardsLive, EntryInput } from "@antumbra/boards";
import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { it } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Effect, Layer, Option, PubSub, Result } from "effect";

const layer = BoardsLive.pipe(Layer.provideMerge(DomainFeedsLive));

it.effectDB("writes notes in order and replays source references", function* (db) {
	yield* Effect.gen(function* () {
		const boards = yield* Boards;
		yield* db.Agent.create({
			charter: "preserve board vocabulary",
			id: "agent-tagged-board",
			role: "hand",
			status: "alive",
		});
		const scope = BoardScope.Agent({ agentId: "agent-tagged-board" });
		const input = EntryInput.Note({
			authorAgentId: Option.none(),
			body: "the durable names stay stable",
			register: "smooth",
			sourceRef: "test:tagged-board-note",
		});

		const first = yield* boards.write(scope, input);
		const replay = yield* boards.write(scope, input);
		const second = yield* boards.write(
			scope,
			EntryInput.Note({
				authorAgentId: Option.none(),
				body: "the next sounding follows",
				register: "smooth",
			}),
		);

		expect(replay.id).toBe(first.id);
		expect([first.seq, second.seq]).toEqual([1, 2]);
		expect((yield* boards.read(scope)).map((entry) => entry.id)).toEqual([first.id, second.id]);
		expect(yield* db.BoardOwner.all()).toMatchObject([{ ownerId: "agent-tagged-board", ownerKind: "agent" }]);
		expect(yield* db.BoardEntry.where({ id: first.id }).all()).toMatchObject([
			{
				kind: "note",
				precedence: "routine",
				sourceRef: "test:tagged-board-note",
			},
		]);
	}).pipe(Effect.provide(layer));
});

it.effectDB("owns replay-safe pull mail with separate delivery and read receipts", function* (db) {
	yield* Effect.scoped(
		Effect.gen(function* () {
			const boards = yield* Boards;
			const feeds = yield* DomainFeeds;
			const notices = yield* feeds.subscribeVoyageRefresh();
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
			expect(yield* boards.unread(input.toAgentId)).toEqual([]);
			yield* boards.markRead(input.toAgentId, []);
			const first = yield* boards.mail(input);
			const replay = yield* boards.mail(input);
			expect(yield* PubSub.takeUpTo(notices, 1)).toEqual([]);
			const note = yield* boards.write(
				BoardScope.Agent({ agentId: input.toAgentId }),
				EntryInput.Note({ authorAgentId: Option.none(), body: "board context is not mail", register: "smooth" }),
			);
			yield* db.Agent.create({ id: "other-mailbox", charter: "receive other mail", role: "hand", status: "alive" });
			const foreign = yield* boards.mail({ ...input, toAgentId: "other-mailbox" });
			const second = yield* boards.mail({ ...input, sourceRef: "selection:attention-2", body: "a second message" });

			expect(replay.id).toBe(first.id);
			expect((yield* boards.unread(input.toAgentId)).map((row) => row.id)).toEqual([first.id, second.id]);

			for (const stray of [note.id, foreign.id]) {
				const rejected = yield* Effect.result(boards.markRead(input.toAgentId, [first.id, stray]));
				expect(Result.isFailure(rejected) && rejected.failure).toMatchObject({ _tag: "MailNotAddressed", entryId: stray });
			}
			expect((yield* boards.unread(input.toAgentId)).map((row) => row.id)).toEqual([first.id, second.id]);
			yield* boards.markRead(input.toAgentId, [first.id]);
			yield* boards.markRead(input.toAgentId, [first.id, first.id]);
			expect((yield* boards.unread(input.toAgentId)).map((row) => row.id)).toEqual([second.id]);
			expect((yield* boards.unread("other-mailbox")).map((row) => row.id)).toEqual([foreign.id]);
			expect(yield* db.BoardEntryReceipt.all()).toMatchObject([{ entryId: first.id }]);

			expect((yield* boards.unread(input.toAgentId)).map((row) => row.delivered)).toEqual([false]);
			const strayDelivery = yield* Effect.result(boards.markDelivered(input.toAgentId, [foreign.id]));
			expect(Result.isFailure(strayDelivery) && strayDelivery.failure).toMatchObject({ _tag: "MailNotAddressed", entryId: foreign.id });
			yield* boards.markDelivered(input.toAgentId, [second.id]);
			yield* boards.markDelivered(input.toAgentId, [second.id, second.id]);
			expect((yield* boards.unread(input.toAgentId)).map((row) => row.delivered)).toEqual([true]);
			expect(yield* db.BoardEntryDelivery.all()).toMatchObject([{ entryId: second.id }]);
		}),
	).pipe(Effect.provide(layer));
});
