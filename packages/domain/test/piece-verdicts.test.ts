import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
} from "#test/harness.ts";
import {
	aliveAgent,
	chain,
	eventually,
	land,
	openReefVoyage,
	stateOf,
} from "#test/voyage-fixtures.ts";

const soleReefPiece = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const voyage = yield* openReefVoyage;
	const piece = yield* domain.voyages.charterPiece({
		charter: "sound the eastern shoal",
		dependsOn: [],
		expectation: "the depths are recorded",
		role: "hand",
		title: "soundings",
		voyageId: voyage.id,
	});
	yield* domain.voyages.launch(piece.id);
	return { piece, voyage };
});

it.live("a delivered verdict is an outcome and the ladder reads done", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const { piece, voyage } = yield* soleReefPiece;
			expect(yield* stateOf(voyage.id, piece.id)).toBe("ready");

			yield* domain.voyages.landPieceVerdict(piece.id, "delivered");

			expect(yield* db.PieceVerdict.all()).toMatchObject([
				{ pieceId: piece.id, verdict: "delivered" },
			]);
			expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("an abandoned piece says so rather than passing for landed work", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece, voyage } = yield* soleReefPiece;

			yield* domain.voyages.landPieceVerdict(piece.id, "abandoned");

			expect(yield* stateOf(voyage.id, piece.id)).toBe("abandoned");
			const view = Option.getOrThrow(yield* domain.voyages.read(voyage.id));
			expect(view.counts.abandoned).toBe(1);
			expect(view.counts.done).toBe(0);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

// why: a piece holds one verdict, so a corrected word replaces the standing
// one — two rows would be two meanings at once, which is the thing the state
// ladder exists to prevent.
it.live("a corrected verdict replaces the one standing, never joins it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const { piece, voyage } = yield* soleReefPiece;

			yield* domain.voyages.landPieceVerdict(piece.id, "abandoned");
			yield* domain.voyages.landPieceVerdict(piece.id, "delivered");

			expect(yield* db.PieceVerdict.all()).toHaveLength(1);
			expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
			expect(
				yield* Effect.flip(
					domain.voyages.landPieceVerdict("no-such-piece", "delivered"),
				),
			).toMatchObject({ _tag: "PieceNotFound" });
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("abandoning a piece releases what was waiting behind it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { alpha, bravo, voyage } = yield* chain;
			expect(yield* stateOf(voyage.id, bravo.id)).toBe("blocked");

			yield* domain.voyages.landPieceVerdict(alpha.id, "abandoned");

			expect(yield* stateOf(voyage.id, alpha.id)).toBe("abandoned");
			expect(yield* stateOf(voyage.id, bravo.id)).toBe("ready");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

// why: the redo lever. A piece whose report landed derives done, and without
// this act there is no honest way to run it again — the pool will never pick
// up a piece it considers finished.
it.live("a piece the ladder has finished with can still be asked to run", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const { piece, voyage } = yield* soleReefPiece;
			yield* land(piece.id, "soundings");
			expect(yield* stateOf(voyage.id, piece.id)).toBe("done");

			const crewed = yield* domain.voyages.workNow(piece.id);

			yield* eventually(aliveAgent(crewed.agentId));
			expect(yield* db.PieceAgent.all()).toMatchObject([
				{ agentId: crewed.agentId, pieceId: piece.id },
			]);
			// why: doneness is about what landed, not about who is at work, and the
			// ladder reads the outcome first — so a finished piece being run again
			// keeps saying it landed. The crew is real all the same, which is why
			// asking twice is refused.
			expect(yield* stateOf(voyage.id, piece.id)).toBe("done");
			expect(
				yield* Effect.flip(domain.voyages.workNow(piece.id)),
			).toMatchObject({ _tag: "PieceAlreadyCrewed" });
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("an abandoned piece refuses crew until its verdict changes", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const { piece } = yield* soleReefPiece;
			yield* domain.voyages.landPieceVerdict(piece.id, "abandoned");

			expect(
				yield* Effect.flip(domain.voyages.workNow(piece.id)),
			).toMatchObject({ _tag: "PieceAbandoned" });
			expect(
				yield* Effect.flip(domain.voyages.workNow("no-such-piece")),
			).toMatchObject({ _tag: "PieceNotFound" });
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
