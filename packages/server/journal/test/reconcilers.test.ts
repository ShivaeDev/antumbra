import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { Database } from "#database.ts";
import { PieceId, VoyageId } from "#example/ids.ts";
import { chartered } from "#example/queries/chartered.ts";
import { reconcilers } from "#reconcilers.ts";
import { definition, type Example, example } from "#test/harness.ts";

const VOYAGE = VoyageId.make("voyage-1");
const FIRST = PieceId.make("piece-1");
const SECOND = PieceId.make("piece-2");

const charter = (app: Example, pieceId: PieceId, title: string) => app.commit.pieces.charter({ pieceId, title, voyageId: VOYAGE });

const parkings = Effect.gen(function* () {
	const database = yield* Database;
	return yield* Effect.orDie(database.write`SELECT "requestId" FROM "journal" WHERE "name" = 'PieceParked'`);
});

example("a reconciler runs at boot over the rows it watches and again when they go dirty", function* (app) {
	yield* charter(app, FIRST, "first");
	yield* reconcilers(definition.features);
	yield* app.roster.untilMustered((counts) => counts.chartered === 1);
	expect(yield* app.roster.musters).toEqual([{ chartered: 1, launched: 0 }]);
	yield* charter(app, SECOND, "second");
	yield* app.roster.untilMustered((counts) => counts.chartered === 2);
	expect(yield* app.roster.musters).toEqual([
		{ chartered: 1, launched: 0 },
		{ chartered: 2, launched: 0 },
	]);
});

example("an each reconciler runs one body for a key and claims it again when the row returns", function* (app) {
	yield* charter(app, FIRST, "first");
	yield* charter(app, SECOND, "second");
	yield* app.roster.hold;
	yield* reconcilers(definition.features);
	yield* app.commit.pieces.launch({ pieceId: FIRST });
	yield* app.roster.untilAnnounced((announcement) => announcement.pieceId === FIRST);
	yield* app.commit.pieces.launch({ pieceId: SECOND });
	yield* app.roster.untilAnnounced((announcement) => announcement.pieceId === SECOND);
	expect(yield* app.roster.announcements).toHaveLength(2);
	yield* app.roster.release;
	yield* app.roster.untilMustered((counts) => counts.chartered === 0 && counts.launched === 0);
	yield* app.commit.pieces.launch({ pieceId: FIRST });
	yield* app.roster.untilAnnounced((announcement) => announcement.pieceId === FIRST);
	expect(yield* app.roster.announcements).toHaveLength(3);
});

example("a reconciler hands the port the request id its commit carries, and that id is spent", function* (app) {
	yield* charter(app, FIRST, "first");
	yield* reconcilers(definition.features);
	yield* app.commit.pieces.launch({ pieceId: FIRST });
	const first = yield* app.roster.untilAnnounced((announcement) => announcement.pieceId === FIRST);
	expect(first.requestId).toBe(`park:${FIRST}`);
	yield* app.roster.untilMustered((counts) => counts.chartered === 0 && counts.launched === 0);
	yield* app.commit.pieces.launch({ pieceId: FIRST });
	const again = yield* app.roster.untilAnnounced((announcement) => announcement.pieceId === FIRST);
	expect(again.requestId).toBe(first.requestId);
	const refused = yield* Effect.flip(app.commit.pieces.park({ pieceId: FIRST, reason: "at rest", requestId: again.requestId }));
	expect(refused).toBeInstanceOf(AlreadyDone);
	expect(yield* parkings).toEqual([{ requestId: `park:${FIRST}` }]);
});

example("a query reads its port on every run and re-runs when its rows change", function* (app) {
	yield* app.roster.sail(["mate", "bosun"]);
	yield* charter(app, FIRST, "first");
	const watching = yield* app.live(chartered, {});
	yield* app.settle();
	expect((yield* watching.seen).at(-1)).toEqual({ crew: ["mate", "bosun"], pieces: [FIRST] });
	yield* app.roster.sail(["cook"]);
	yield* charter(app, SECOND, "second");
	yield* app.settle();
	const latest = yield* watching.seen;
	expect(latest.at(-1)?.crew).toEqual(["cook"]);
	expect([...(latest.at(-1)?.pieces ?? [])].toSorted()).toEqual([FIRST, SECOND]);
});

example("a rejection the body leaves uncaught ends that run and leaves the reconciler working", function* (app) {
	yield* charter(app, FIRST, "first");
	yield* reconcilers(definition.features);
	yield* app.commit.pieces.launch({ pieceId: FIRST });
	yield* app.roster.untilAnnounced((announcement) => announcement.pieceId === FIRST);
	yield* app.roster.untilMustered((counts) => counts.chartered === 0 && counts.launched === 0);
	yield* app.commit.pieces.launch({ pieceId: FIRST });
	yield* app.roster.untilAnnounced((announcement) => announcement.pieceId === FIRST);
	yield* charter(app, SECOND, "second");
	yield* app.roster.untilMustered((counts) => counts.chartered === 1);
	yield* app.commit.pieces.launch({ pieceId: SECOND });
	yield* app.roster.untilAnnounced((announcement) => announcement.pieceId === SECOND);
	expect(yield* app.roster.announcements).toHaveLength(3);
});
