import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Artifacts } from "@antumbra/artifacts";
import { Database, type DatabaseService } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { Pieces } from "@antumbra/pieces";
import { Reports } from "@antumbra/reports";
import { Voyages } from "@antumbra/voyages";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend } from "#test/harness.ts";
import type { VoyageProcedures } from "#voyages/service.ts";

const openVoyage = Effect.gen(function* () {
	const voyages = yield* Voyages;
	return yield* voyages.open({ context: "the reef is uncharted", name: "Chart the reef", northStar: "every shoal is known" });
});

const charter = (voyageId: string, title: string, dependsOn: ReadonlyArray<string> = []) =>
	Effect.flatMap(Pieces, (owner) =>
		owner.charter({
			charter: `do ${title}`,
			dependsOn,
			expectation: `${title} is landed`,
			role: "hand",
			title,
			voyageId,
		}),
	);

const stateOf = (voyages: VoyageProcedures, voyageId: string, title: string) =>
	voyages.read(voyageId).pipe(
		Effect.map((view) => Option.getOrThrow(view).pieces.find((piece) => piece.title === title)),
		Effect.map((piece) => piece?.state),
	);

const withDomain = <A, E, R>(body: (voyages: VoyageProcedures, temporary: TemporaryPersistence, db: DatabaseService) => Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			yield* body(domain.voyages, temporary, db);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	});

it.live("a voyage holds the pieces chartered into it, gated by edges", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const voyage = yield* openVoyage;
			const first = yield* charter(voyage.id, "sound the shallows");
			const second = yield* charter(voyage.id, "draw the chart", [first.id]);
			const db = yield* Database;
			yield* db.Piece.where({ id: first.id }).update({ createdAt: new Date(1) });
			yield* db.Piece.where({ id: second.id }).update({ createdAt: new Date(2) });
			const view = Option.getOrThrow(yield* voyages.read(voyage.id));
			expect(view.name).toBe("Chart the reef");
			expect(view.state).toBe("quiet");
			expect(view.pieces.map((piece) => piece.title)).toEqual(["sound the shallows", "draw the chart"]);
			expect(view.pieces.find((piece) => piece.id === second.id)?.dependsOn).toEqual([first.id]);
			expect(view.pieces.map((piece) => piece.state)).toEqual(["held", "held"]);
		}),
	),
);

it.live("chartering onto a piece that does not exist is refused", () =>
	withDomain(() =>
		Effect.gen(function* () {
			const voyage = yield* openVoyage;
			const failure = yield* Effect.flip(charter(voyage.id, "sail nowhere", ["no-such-piece"]));
			expect(failure._tag).toBe("PieceNotFound");
		}),
	),
);

it.live("rewiring may never make a piece depend on itself", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const pieces = yield* Pieces;
			const voyage = yield* openVoyage;
			const alpha = yield* charter(voyage.id, "alpha");
			const beta = yield* charter(voyage.id, "beta", [alpha.id]);
			const gamma = yield* charter(voyage.id, "gamma", [beta.id]);

			const loop = yield* Effect.flip(pieces.setDependencies(alpha.id, [alpha.id]));
			expect(loop._tag).toBe("EdgeWouldCycle");
			const cycle = yield* Effect.flip(pieces.setDependencies(alpha.id, [gamma.id]));
			expect(cycle._tag).toBe("EdgeWouldCycle");

			yield* pieces.setDependencies(gamma.id, [alpha.id]);
			const view = Option.getOrThrow(yield* voyages.read(voyage.id));
			expect(view.pieces.find((piece) => piece.id === gamma.id)?.dependsOn).toEqual([alpha.id]);
		}),
	),
);

it.live("launching walks a piece from held to ready, its dependent blocked", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const pieces = yield* Pieces;
			const voyage = yield* openVoyage;
			const first = yield* charter(voyage.id, "sound");
			const second = yield* charter(voyage.id, "draw", [first.id]);

			yield* pieces.launch(first.id);
			yield* pieces.launch(second.id);
			expect(yield* stateOf(voyages, voyage.id, "sound")).toBe("ready");
			expect(yield* stateOf(voyages, voyage.id, "draw")).toBe("blocked");

			yield* pieces.launch(first.id);
			expect(yield* stateOf(voyages, voyage.id, "sound")).toBe("ready");
		}),
	),
);

it.live("a landed report is the only thing that makes a piece done", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const pieces = yield* Pieces;
			const reports = yield* Reports;
			const voyage = yield* openVoyage;
			const first = yield* charter(voyage.id, "sound");
			const second = yield* charter(voyage.id, "draw", [first.id]);
			yield* pieces.launch(first.id);
			yield* pieces.launch(second.id);

			const report = yield* reports.land({
				body: "three fathoms at the eastern spit",
				pieceId: first.id,
				title: "soundings",
			});
			expect(yield* stateOf(voyages, voyage.id, "sound")).toBe("done");
			expect(yield* stateOf(voyages, voyage.id, "draw")).toBe("ready");

			const view = Option.getOrThrow(yield* voyages.read(voyage.id));
			expect(view.pieces.find((piece) => piece.id === first.id)?.reports).toMatchObject([
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
			const pieces = yield* Pieces;
			const artifacts = yield* Artifacts;
			const reports = yield* Reports;
			const voyage = yield* openVoyage;
			const piece = yield* charter(voyage.id, "draw");
			yield* pieces.launch(piece.id);
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
			const artifact = yield* artifacts.land({
				authorAgentId: "agent-cartographer",
				path: "reef.md",
				pieceId: piece.id,
				title: "the chart",
			});
			expect(artifact.artifact.authorAgentId).toBe("agent-cartographer");
			expect(yield* stateOf(voyages, voyage.id, "draw")).toBe("done");

			const orphan = yield* Effect.flip(
				reports.land({
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
			const pieces = yield* Pieces;
			const voyage = yield* openVoyage;
			const piece = yield* charter(voyage.id, "sound");
			yield* pieces.launch(piece.id);
			yield* pieces.park(piece.id, true);
			expect(yield* stateOf(voyages, voyage.id, "sound")).toBe("parked");
			yield* pieces.park(piece.id, false);
			expect(yield* stateOf(voyages, voyage.id, "sound")).toBe("ready");
		}),
	),
);

it.live("the list carries every voyage with its piece counts and focus", () =>
	withDomain((voyages) =>
		Effect.gen(function* () {
			const pieces = yield* Pieces;
			const voyage = yield* openVoyage;
			const first = yield* charter(voyage.id, "sound");
			yield* charter(voyage.id, "draw", [first.id]);
			yield* pieces.launch(first.id);
			const voyageRecords = yield* Voyages;
			yield* voyageRecords.setFocus(voyage.id, true);

			const listed = yield* voyages.list();
			expect(listed).toHaveLength(1);
			expect(listed[0]?.focusedAt).not.toBeNull();
			expect(listed[0]?.state).toBe("quiet");
			expect(listed[0]?.counts).toEqual({
				abandoned: 0,
				active: 0,
				blocked: 0,
				done: 0,
				held: 1,
				landing: 0,
				parked: 0,
				ready: 1,
			});

			yield* voyageRecords.setFocus(voyage.id, false);
			expect((yield* voyages.list())[0]?.focusedAt).toBeNull();
			expect(Option.isNone(yield* voyages.read("no-such-voyage"))).toBe(true);
		}),
	),
);
