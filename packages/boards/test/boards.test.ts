import { BoardScope, Boards, BoardsLive, EntryInput } from "@antumbra/boards";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { it } from "@antumbra/persistence/testing";
import { scriptedPieces } from "@antumbra/pieces/testing";
import { scriptedRoleSettings } from "@antumbra/settings/testing";
import { scriptedVoyages } from "@antumbra/voyages/testing";
import { expect } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";

const layer = BoardsLive.pipe(
	Layer.provide(scriptedPieces),
	Layer.provide(scriptedVoyages),
	Layer.provide(scriptedRoleSettings),
	Layer.provideMerge(DomainFeedsLive),
);

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
