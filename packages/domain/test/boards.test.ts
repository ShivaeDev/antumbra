import type { BoardScope } from "@antumbra/boards";
import { Database, Writer } from "@antumbra/persistence";
import { deleteTestAgent } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
} from "#test/harness.ts";
import { openReefVoyage } from "#test/voyage-fixtures.ts";

const withDomain = <A, E, R>(body: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* body.pipe(
			Effect.provide(domainKernelLayer(temporary, scripted.backend)),
		);
	});

const hand = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			db.Agent.create({
				charter: "sound the shallows",
				id: agentId,
				role: "hand",
				status: "alive",
			}),
		);
		return { agentId, kind: "agent" } satisfies BoardScope;
	});

const noted = (body: string) => ({
	authorAgentId: Option.none<string>(),
	body,
	register: "smooth" as const,
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
					seq: 1,
				},
				{
					authorAgentId: "agent-1",
					body: "the swell is running",
					register: "rough",
					seq: 2,
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
				yield* hand("agent-1"),
			];
			yield* Effect.forEach(scopes, (scope) =>
				domain.boards.write(scope, noted(`written to ${scope.kind}`)),
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
			expect(
				yield* domain.boards.read({ kind: "voyage", voyageId: voyage.id }),
			).toEqual([]);
		}),
	),
);

it.live("two hands writing at once still find one board", () =>
	withDomain(
		Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const scope = yield* hand("agent-1");
			yield* Effect.forEach(
				["port watch", "starboard watch"],
				(body) => domain.boards.write(scope, noted(body)),
				{ concurrency: "unbounded" },
			);
			expect((yield* db.Board.all()).length).toBe(1);
			expect((yield* db.BoardOwner.all()).length).toBe(1);
		}),
	),
);

it.live("interleaved appends take distinct places in the log", () =>
	withDomain(
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			const scope: BoardScope = { kind: "voyage", voyageId: voyage.id };
			const bodies = ["one", "two", "three", "four", "five", "six"];
			yield* Effect.forEach(
				bodies,
				(body, index) =>
					domain.boards.write(scope, {
						authorAgentId: Option.some(index % 2 === 0 ? "port" : "starboard"),
						body,
						register: "rough",
					}),
				{ concurrency: "unbounded" },
			);
			const entries = yield* domain.boards.read(scope);
			expect(entries.map((entry) => entry.seq)).toEqual([1, 2, 3, 4, 5, 6]);
		}),
	),
);

it.live("the log reads in its own order, not the clock's", () =>
	withDomain(
		Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			const scope: BoardScope = { kind: "voyage", voyageId: voyage.id };
			const boardId = yield* domain.boards.ensure(scope);
			const tied = new Date("2026-08-16T00:00:00.000Z");
			yield* Effect.forEach([2, 1], (seq) =>
				writer.write(
					db.BoardEntry.create({
						authorAgentId: null,
						boardId,
						body: `entry ${seq}`,
						createdAt: tied,
						id: `entry-${seq}`,
						register: "smooth",
						seq,
					}),
				),
			);
			expect((yield* domain.boards.read(scope)).map((row) => row.body)).toEqual(
				["entry 1", "entry 2"],
			);
		}),
	),
);

it.live("a board is never minted for an entity that is not there", () =>
	withDomain(
		Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const refused = yield* Effect.flip(
				domain.boards.write(
					{ agentId: "nobody", kind: "agent" },
					noted("hello?"),
				),
			);
			expect(refused._tag).toBe("BoardOwnerNotFound");
			expect(yield* db.Board.all()).toEqual([]);
			expect(yield* db.BoardOwner.all()).toEqual([]);
		}),
	),
);

it.live("one board cannot be linked to owners of two different kinds", () =>
	withDomain(
		Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			const domain = yield* AgentDomain;
			const voyage = yield* openReefVoyage;
			const agent = yield* hand("agent-1");
			const boardId = yield* domain.boards.ensure({
				kind: "voyage",
				voyageId: voyage.id,
			});
			const collision = yield* Effect.exit(
				writer.write(
					db.BoardOwner.create({
						boardId,
						ownerId: agent.agentId,
						ownerKind: agent.kind,
					}),
				),
			);
			expect(collision._tag).toBe("Failure");
			expect(yield* db.BoardOwner.all()).toMatchObject([
				{ boardId, ownerId: voyage.id, ownerKind: "voyage" },
			]);
		}),
	),
);

it.live(
	"a surviving link refuses reads and writes after its owner is deleted",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const db = yield* Database;
				const domain = yield* AgentDomain;
				const scope = yield* hand("agent-1");
				const boardId = yield* domain.boards.ensure(scope);
				yield* domain.boards.write(scope, noted("retained history"));
				yield* Effect.sync(() =>
					deleteTestAgent(temporary.database, scope.agentId),
				);
				const read = yield* Effect.flip(domain.boards.read(scope));
				const write = yield* Effect.flip(
					domain.boards.write(scope, noted("orphaned mail")),
				);
				expect(read._tag).toBe("BoardOwnerNotFound");
				expect(write._tag).toBe("BoardOwnerNotFound");
				expect(
					(yield* db.BoardEntry.where({ boardId }).all()).map((entry) => ({
						body: entry.body,
						seq: entry.seq,
					})),
				).toEqual([{ body: "retained history", seq: 1 }]);
			}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
		}),
);
