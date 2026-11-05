import { answered, it } from "@antumbra/app-testing/entry.ts";
import { changeFeedback as changeFeedbackRecordSchema } from "@antumbra/domain-changes/rows/change-feedback.ts";
import { ANTUMBRA_TRAILER } from "@antumbra/platform-vocabulary/change-host.ts";
import { ChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { Effect, Schema } from "effect";
import { expect } from "vitest";
import { adoption, chartering, comment, inline, opening, registration, repoId, request, review, seen } from "#test/kit.ts";

it.app("records adoption once and preserves terminal host truth against a later open observation", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.changes.adopt(adoption);
	yield* app.api.changes.adopt(adoption);
	expect(yield* app.rows.change.count({ where: {} }).pipe(Effect.orDie)).toBe(1);
	expect(yield* app.rows.pieceChange.count({ where: {} }).pipe(Effect.orDie)).toBe(1);
	yield* app.api.changes.observe({
		requestId: request("observe:landed"),
		host: "github",
		observation: seen("landed", 3000),
		attachment: { _tag: "Observed" },
		observedAt: new Date(4000).toISOString(),
	});
	yield* app.api.changes.observe({
		requestId: request("observe:late-open"),
		host: "github",
		observation: seen("open", 5000),
		attachment: { _tag: "Observed" },
		observedAt: new Date(6000).toISOString(),
	});
	expect((yield* answered(app.api.changes.all({}), "all changes to be listed"))[0]?.stage).toBe("landed");
	expect(yield* app.rows.changeTransition.count({ where: {} }).pipe(Effect.orDie)).toBe(1);
	expect(
		(yield* app.rows.voyageActivity
			.findMany({
				where: { sourceKind: "change" },
				orderBy: { field: "storage_order", direction: "asc" },
				select: ["id", "voyageId", "sourceKind", "sourceId", "at"],
			})
			.pipe(Effect.orDie))[0]?.at,
	).toBe(new Date(3000).toISOString());
	expect(yield* answered(app.api.changes.quay({}), "the quay to be listed")).toMatchObject([{ group: "landed", stage: "landed" }]);
	expect(
		(yield* app.rows.pieceOutcome
			.findMany({
				where: { sourceKind: "change" },
				orderBy: { field: "id", direction: "asc" },
				select: ["id", "pieceId", "sourceKind", "sourceId", "status"],
			})
			.pipe(Effect.orDie))[0]?.status,
	).toBe("landed");
});

it.app("keeps stale evidence out of the Quay and records no duplicate stage transition", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.changes.adopt(adoption);
	yield* app.api.changes.observe({
		requestId: request("observe:stale"),
		host: "github",
		observation: seen("withdrawn", 500),
		attachment: { _tag: "Observed" },
		observedAt: new Date(4000).toISOString(),
	});
	expect((yield* answered(app.api.changes.quay({}), "the quay to be listed"))[0]?.stage).toBe("open");
	yield* app.api.changes.observe({
		requestId: request("observe:withdrawn"),
		host: "github",
		observation: seen("withdrawn", 3000),
		attachment: { _tag: "Observed" },
		observedAt: new Date(4000).toISOString(),
	});
	yield* app.api.changes.observe({
		requestId: request("observe:again"),
		host: "github",
		observation: seen("withdrawn", 3000),
		attachment: { _tag: "Observed" },
		observedAt: new Date(5000).toISOString(),
	});
	expect(yield* app.rows.changeTransition.count({ where: {} }).pipe(Effect.orDie)).toBe(1);
	yield* app.api.changes.dismiss({ requestId: request("dismiss"), changeId: ChangeId.make(adoption.requestId) });
	expect(yield* answered(app.api.changes.quay({}), "the quay to be listed")).toEqual([]);
	expect(yield* app.rows.pieceOutcome.count({ where: { sourceKind: "change" } }).pipe(Effect.orDie)).toBe(0);
});

it.app("forgetting a repository removes its Change graph and derived outcome contributions in the same commit", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.changes.adopt(adoption);
	yield* app.api.changes.observe({
		requestId: request("observe:withdrawn"),
		host: "github",
		observation: seen("withdrawn", 3000),
		attachment: { _tag: "Observed" },
		observedAt: new Date(4000).toISOString(),
	});
	yield* app.api.changes.dismiss({ requestId: request("dismiss"), changeId: ChangeId.make(adoption.requestId) });
	yield* app.api.repos.forget({ requestId: request("forget"), id: repoId });
	expect(yield* app.rows.change.count({ where: {} }).pipe(Effect.orDie)).toBe(0);
	expect(yield* app.rows.pieceChange.count({ where: {} }).pipe(Effect.orDie)).toBe(0);
	expect(yield* app.rows.changeTransition.count({ where: {} }).pipe(Effect.orDie)).toBe(0);
	expect(yield* app.rows.changeVerdict.count({ where: {} }).pipe(Effect.orDie)).toBe(0);
	expect(yield* app.rows.voyageActivity.count({ where: { sourceKind: "change" } }).pipe(Effect.orDie)).toBe(0);
	expect(yield* app.rows.pieceOutcome.count({ where: { sourceKind: "change" } }).pipe(Effect.orDie)).toBe(0);
	expect(yield* answered(app.api.changes.quay({}), "the quay to be listed")).toEqual([]);
});

it.app("records each word written on a change once, keeps Antumbra's own post out, and re-raises an edited one", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.changes.adopt(adoption);
	const changeId = ChangeId.make(adoption.requestId);
	const words = [
		review("r1", "The empty reef needs a test before this lands.", 1100),
		inline("c1", "This reads the first tide before one is recorded.", 1200),
		comment("i1", "Can this land today?", 1300),
		comment("i2", `Opened it from the app.\n\n${ANTUMBRA_TRAILER}`, 1400),
	];
	const observed = { ...seen("open", 2000, words), review: "none" as const };
	yield* app.api.changes.observe({
		requestId: request("observe:words"),
		host: "github",
		observation: observed,
		attachment: { _tag: "Observed" },
		observedAt: new Date(3000).toISOString(),
	});
	expect(
		(yield* app.rows.changeFeedback
			.findMany({
				where: {},
				orderBy: { field: "storage_order", direction: "asc" },
				select: ["id", "changeId", "kind", "author", "verdict", "path", "line", "body", "url", "at", "forwardedAt"],
			})
			.pipe(Effect.orDie))
			.map((row) => row.id)
			.sort(),
	).toEqual(["c1", "i1", "r1"]);
	expect(
		yield* app.rows.changeFeedback.findById("c1").pipe(Effect.flatMap(Schema.decodeUnknownEffect(changeFeedbackRecordSchema.Row)), Effect.orDie),
	).toMatchObject({ changeId, forwardedAt: null, line: 42, path: "src/reef.ts" });
	expect((yield* answered(app.api.changes.all({}), "all changes to be listed"))[0]?.review).toBe("commented");

	yield* app.api.changes.forwardFeedback({ requestId: request("forward"), changeId, ids: ["r1", "c1", "i1"] });
	expect(yield* app.rows.changeFeedback.count({ where: { forwardedAt: null } }).pipe(Effect.orDie)).toBe(0);
	yield* app.api.changes.observe({
		requestId: request("observe:same"),
		host: "github",
		observation: observed,
		attachment: { _tag: "Observed" },
		observedAt: new Date(4000).toISOString(),
	});
	expect(yield* app.rows.changeFeedback.count({ where: { forwardedAt: null } }).pipe(Effect.orDie)).toBe(0);

	const edited = words.map((item) => (item.id === "r1" ? { ...item, body: "The empty reef needs two tests before this lands." } : item));
	yield* app.api.changes.observe({
		requestId: request("observe:edited"),
		host: "github",
		observation: { ...observed, activityAt: 5000, feedback: edited },
		attachment: { _tag: "Observed" },
		observedAt: new Date(6000).toISOString(),
	});
	expect(yield* app.rows.changeFeedback.count({ where: {} }).pipe(Effect.orDie)).toBe(3);
	expect(
		yield* app.rows.changeFeedback.findById("r1").pipe(Effect.flatMap(Schema.decodeUnknownEffect(changeFeedbackRecordSchema.Row)), Effect.orDie),
	).toMatchObject({ body: "The empty reef needs two tests before this lands.", forwardedAt: null });
});
