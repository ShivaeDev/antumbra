import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
	Database,
	type DatabaseService,
	type WriteExecutors,
} from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { wouldCycle } from "#piece-state.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
} from "#test/harness.ts";
import type { VoyageProcedures } from "#voyages.ts";

const openVoyage = (voyages: VoyageProcedures) =>
	voyages.open({
		backend: "scripted",
		context: "the reef is uncharted",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});

const charter = (
	voyages: VoyageProcedures,
	voyageId: string,
	title: string,
	dependsOn: ReadonlyArray<string> = [],
) =>
	voyages.charterPiece({
		charter: `do ${title}`,
		dependsOn,
		expectation: `${title} is landed`,
		role: "hand",
		title,
		voyageId,
	});

const stateOf = (voyages: VoyageProcedures, voyageId: string, title: string) =>
	voyages.read(voyageId).pipe(
		Effect.map((view) =>
			Option.getOrThrow(view).pieces.find((piece) => piece.title === title),
		),
		Effect.map((piece) => piece?.state),
	);

const withDomain = <A, E>(
	body: (
		voyages: VoyageProcedures,
		temporary: TemporaryPersistence,
		db: DatabaseService,
	) => Effect.Effect<A, E, WriteExecutors>,
) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			yield* body(domain.voyages, temporary, db);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	});

it("wouldCycle refuses a self-loop and a closing edge", () => {
	expect(wouldCycle([], "a", "a")).toBe(true);
	const chain = [
		{ fromPieceId: "a", toPieceId: "b" },
		{ fromPieceId: "b", toPieceId: "c" },
	];
	expect(wouldCycle(chain, "c", "a")).toBe(true);
	expect(wouldCycle(chain, "a", "c")).toBe(false);
});

it.live("a voyage holds the pieces chartered into it, gated by edges", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const voyage = yield* openVoyage(voyages);
			const first = yield* charter(voyages, voyage.id, "sound the shallows");
			const second = yield* charter(voyages, voyage.id, "draw the chart", [
				first.id,
			]);
			const view = Option.getOrThrow(yield* voyages.read(voyage.id));
			expect(view.name).toBe("Chart the reef");
			expect(view.state).toBe("quiet");
			expect(view.pieces.map((piece) => piece.title)).toEqual([
				"sound the shallows",
				"draw the chart",
			]);
			expect(
				view.pieces.find((piece) => piece.id === second.id)?.dependsOn,
			).toEqual([first.id]);
			expect(view.pieces.map((piece) => piece.state)).toEqual(["held", "held"]);
		}),
	),
);

it.live("chartering onto a piece that does not exist is refused", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const voyage = yield* openVoyage(voyages);
			const failure = yield* Effect.flip(
				charter(voyages, voyage.id, "sail nowhere", ["no-such-piece"]),
			);
			expect(failure._tag).toBe("PieceNotFound");
		}),
	),
);

it.live("rewiring may never make a piece depend on itself", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const voyage = yield* openVoyage(voyages);
			const alpha = yield* charter(voyages, voyage.id, "alpha");
			const beta = yield* charter(voyages, voyage.id, "beta", [alpha.id]);
			const gamma = yield* charter(voyages, voyage.id, "gamma", [beta.id]);

			const loop = yield* Effect.flip(voyages.rewire(alpha.id, [alpha.id]));
			expect(loop._tag).toBe("EdgeWouldCycle");
			const cycle = yield* Effect.flip(voyages.rewire(alpha.id, [gamma.id]));
			expect(cycle._tag).toBe("EdgeWouldCycle");

			yield* voyages.rewire(gamma.id, [alpha.id]);
			const view = Option.getOrThrow(yield* voyages.read(voyage.id));
			expect(
				view.pieces.find((piece) => piece.id === gamma.id)?.dependsOn,
			).toEqual([alpha.id]);
		}),
	),
);

it.live(
	"launching walks a piece from held to ready, its dependent blocked",
	() =>
		withDomain((voyages) =>
			Effect.gen(function* () {
				const voyage = yield* openVoyage(voyages);
				const first = yield* charter(voyages, voyage.id, "sound");
				const second = yield* charter(voyages, voyage.id, "draw", [first.id]);

				yield* voyages.launch(first.id);
				yield* voyages.launch(second.id);
				expect(yield* stateOf(voyages, voyage.id, "sound")).toBe("ready");
				expect(yield* stateOf(voyages, voyage.id, "draw")).toBe("blocked");

				yield* voyages.launch(first.id);
				expect(yield* stateOf(voyages, voyage.id, "sound")).toBe("ready");
			}),
		),
);

it.live("a landed report is the only thing that makes a piece done", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const voyage = yield* openVoyage(voyages);
			const first = yield* charter(voyages, voyage.id, "sound");
			const second = yield* charter(voyages, voyage.id, "draw", [first.id]);
			yield* voyages.launch(first.id);
			yield* voyages.launch(second.id);

			const report = yield* voyages.landReport({
				body: "three fathoms at the eastern spit",
				pieceId: first.id,
				title: "soundings",
			});
			expect(yield* stateOf(voyages, voyage.id, "sound")).toBe("done");
			expect(yield* stateOf(voyages, voyage.id, "draw")).toBe("ready");

			const view = Option.getOrThrow(yield* voyages.read(voyage.id));
			expect(
				view.pieces.find((piece) => piece.id === first.id)?.reports,
			).toEqual([
				{
					authorAgentId: null,
					body: "three fathoms at the eastern spit",
					id: report.id,
					title: "soundings",
				},
			]);
		}),
	),
);

it.live("a landed artifact carries its author and lands the piece", () =>
	withDomain((voyages, temporary, db) =>
		Effect.gen(function* () {
			const voyage = yield* openVoyage(voyages);
			const piece = yield* charter(voyages, voyage.id, "draw");
			yield* voyages.launch(piece.id);
			const moorage = join(dirname(temporary.database), "manual-moorage");
			mkdirSync(moorage);
			writeFileSync(join(moorage, "reef.md"), "# Reef\n");
			yield* db.Agent.create({
				charter: "draw the reef",
				id: "agent-cartographer",
				role: "cartographer",
				status: "alive",
			});
			yield* db.Moorage.create({
				agentId: "agent-cartographer",
				reclaimState: null,
				root: moorage,
				runner: "local",
				status: "ready",
			});
			const artifact = yield* voyages.landArtifact({
				authorAgentId: "agent-cartographer",
				path: "reef.md",
				pieceId: piece.id,
				title: "the chart",
			});
			expect(artifact.artifact.authorAgentId).toBe("agent-cartographer");
			expect(yield* stateOf(voyages, voyage.id, "draw")).toBe("done");

			const orphan = yield* Effect.flip(
				voyages.landReport({
					body: "nowhere",
					pieceId: "no-such-piece",
					title: "lost",
				}),
			);
			expect(orphan._tag).toBe("PieceNotFound");
		}),
	),
);

it.live("parking holds a ready piece back until it is unparked", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const voyage = yield* openVoyage(voyages);
			const piece = yield* charter(voyages, voyage.id, "sound");
			yield* voyages.launch(piece.id);
			yield* voyages.park(piece.id);
			expect(yield* stateOf(voyages, voyage.id, "sound")).toBe("parked");
			yield* voyages.unpark(piece.id);
			expect(yield* stateOf(voyages, voyage.id, "sound")).toBe("ready");
		}),
	),
);

it.live("the list carries every voyage with its piece counts and focus", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const voyage = yield* openVoyage(voyages);
			const first = yield* charter(voyages, voyage.id, "sound");
			yield* charter(voyages, voyage.id, "draw", [first.id]);
			yield* voyages.launch(first.id);
			yield* voyages.setFocus(voyage.id, true);

			const listed = yield* voyages.list;
			expect(listed).toHaveLength(1);
			expect(listed[0]?.focusedAt).not.toBeNull();
			expect(listed[0]?.state).toBe("quiet");
			expect(listed[0]?.counts).toEqual({
				active: 0,
				blocked: 0,
				done: 0,
				held: 1,
				landing: 0,
				parked: 0,
				ready: 1,
			});

			yield* voyages.setFocus(voyage.id, false);
			expect((yield* voyages.list)[0]?.focusedAt).toBeNull();
			expect(Option.isNone(yield* voyages.read("no-such-voyage"))).toBe(true);
		}),
	),
);
