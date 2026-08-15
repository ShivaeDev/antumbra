import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import type { BoardScope } from "#board-scope.ts";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
} from "#test/harness.ts";
import { openReefVoyage } from "#test/voyage-fixtures.ts";

const withDomain = <A, E>(body: Effect.Effect<A, E, AgentDomain>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* body.pipe(
			Effect.provide(domainKernelLayer(temporary, scripted.backend)),
		);
	});

it.live("a board keeps both registers in the order they were written", () =>
	withDomain(
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			const scope: BoardScope = { kind: "voyage", voyageId: voyage.id };
			yield* domain.boards.write(scope, {
				authorAgentId: Option.none(),
				body: "sail the eastern approach first",
				register: "smooth",
			});
			yield* domain.boards.write(scope, {
				authorAgentId: Option.some("agent-1"),
				body: "the swell is running",
				register: "rough",
			});
			expect(yield* domain.boards.read(scope)).toMatchObject([
				{
					authorAgentId: null,
					body: "sail the eastern approach first",
					register: "smooth",
				},
				{
					authorAgentId: "agent-1",
					body: "the swell is running",
					register: "rough",
				},
			]);
		}),
	),
);

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
				{ kind: "voyage", voyageId: voyage.id },
				{ kind: "piece", pieceId: piece.id },
				{ agentId: "agent-1", kind: "agent" },
			];
			yield* Effect.forEach(scopes, (scope) =>
				domain.boards.write(scope, {
					authorAgentId: Option.none(),
					body: `written to ${scope.kind}`,
					register: "smooth",
				}),
			);
			for (const scope of scopes) {
				expect(yield* domain.boards.read(scope)).toMatchObject([
					{ body: `written to ${scope.kind}` },
				]);
			}
		}),
	),
);

it.live("an entity has one board, however often it is asked for", () =>
	withDomain(
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			const scope: BoardScope = { kind: "voyage", voyageId: voyage.id };
			const first = yield* domain.boards.ensure(scope);
			expect(yield* domain.boards.ensure(scope)).toBe(first);
			yield* domain.boards.write(scope, {
				authorAgentId: Option.none(),
				body: "the reef is charted to the north",
				register: "smooth",
			});
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
			expect(
				yield* domain.boards.read({ kind: "voyage", voyageId: voyage.id }),
			).toEqual([]);
		}),
	),
);
