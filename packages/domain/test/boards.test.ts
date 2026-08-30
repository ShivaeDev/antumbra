import { BoardScope, EntryInput } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend } from "#test/harness.ts";
import { openReefVoyage } from "#test/voyage-fixtures.ts";

const withDomain = <A, E, R>(body: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* body.pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	});

const hand = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Agent.create({
			charter: "sound the shallows",
			id: agentId,
			role: "hand",
			status: "alive",
		});
		return BoardScope.Agent({ agentId });
	});

const noted = (body: string) =>
	EntryInput.Note({
		authorAgentId: Option.none<string>(),
		body,
		register: "smooth" as const,
	});

it.live("every durable entity carries its own board", () =>
	withDomain(
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			const piece = yield* domain.voyages.charterPiece({
				charter: "sound the shallows",
				dependsOn: [],
				expectation: "soundings are landed",
				role: "hand",
				title: "alpha",
				voyageId: voyage.id,
			});
			const scopes: ReadonlyArray<BoardScope> = [
				BoardScope.Voyage({ voyageId: voyage.id }),
				BoardScope.Piece({ pieceId: piece.id }),
				yield* hand("agent-1"),
			];
			yield* Effect.forEach(scopes, (scope) => domain.boards.write(scope, noted(`written to ${scope._tag}`)));
			for (const scope of scopes) {
				expect(yield* domain.boards.read(scope)).toMatchObject([{ body: `written to ${scope._tag}` }]);
			}
		}),
	),
);

it.live("an entity has one board, however often it is asked for", () =>
	withDomain(
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			const scope = BoardScope.Voyage({ voyageId: voyage.id });
			const first = yield* domain.boards.ensure(scope);
			expect(yield* domain.boards.ensure(scope)).toBe(first);
			yield* domain.boards.write(scope, noted("the reef is charted north"));
			expect(yield* domain.boards.ensure(scope)).toBe(first);
			expect((yield* domain.boards.read(scope)).length).toBe(1);
		}),
	),
);

it.live("an entity nobody has written to reads as an empty board", () =>
	withDomain(
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			expect(yield* domain.boards.read(BoardScope.Voyage({ voyageId: voyage.id }))).toEqual([]);
		}),
	),
);
