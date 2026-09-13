import { answered, it } from "@antumbra/app-testing/entry.ts";
import { ANTUMBRA_TRAILER } from "@antumbra/platform-vocabulary/change-host.ts";
import { expect } from "vitest";
import { ChangeId } from "#ids.ts";
import { adoption, chartering, comment, inline, opening, registration, repoId, request, review, seen } from "#test/kit.ts";

it.app("records adoption once and preserves terminal host truth against a later open observation", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.changes.adopt(adoption);
	yield* app.api.changes.adopt(adoption);
	expect(yield* app.rows.change.count({})).toBe(1);
	expect(yield* app.rows.pieceChange.count({})).toBe(1);
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
	expect((yield* answered(app.api.changes.all({})))[0]?.stage).toBe("landed");
	expect(yield* app.rows.changeTransition.count({})).toBe(1);
	expect((yield* app.rows.voyageActivity.where({ sourceKind: "change" }))[0]?.at).toBe(new Date(3000).toISOString());
	expect(yield* answered(app.api.changes.quay({}))).toMatchObject([{ group: "landed", stage: "landed" }]);
	expect((yield* app.rows.pieceOutcome.where({ sourceKind: "change" }))[0]?.status).toBe("landed");
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
	expect((yield* answered(app.api.changes.quay({})))[0]?.stage).toBe("open");
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
	expect(yield* app.rows.changeTransition.count({})).toBe(1);
	yield* app.api.changes.dismiss({ requestId: request("dismiss"), changeId: ChangeId.make(adoption.requestId) });
	expect(yield* answered(app.api.changes.quay({}))).toEqual([]);
	expect(yield* app.rows.pieceOutcome.count({ sourceKind: "change" })).toBe(0);
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
	expect(yield* app.rows.change.count({})).toBe(0);
	expect(yield* app.rows.pieceChange.count({})).toBe(0);
	expect(yield* app.rows.changeTransition.count({})).toBe(0);
	expect(yield* app.rows.changeVerdict.count({})).toBe(0);
	expect(yield* app.rows.voyageActivity.count({ sourceKind: "change" })).toBe(0);
	expect(yield* app.rows.pieceOutcome.count({ sourceKind: "change" })).toBe(0);
	expect(yield* answered(app.api.changes.quay({}))).toEqual([]);
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
	expect((yield* app.rows.changeFeedback.where({})).map((row) => row.id).sort()).toEqual(["c1", "i1", "r1"]);
	expect(yield* app.rows.changeFeedback.get("c1")).toMatchObject({ changeId, forwardedAt: null, line: 42, path: "src/reef.ts" });
	expect((yield* answered(app.api.changes.all({})))[0]?.review).toBe("commented");

	yield* app.api.changes.forwardFeedback({ requestId: request("forward"), changeId, ids: ["r1", "c1", "i1"] });
	expect(yield* app.rows.changeFeedback.count({ forwardedAt: null })).toBe(0);
	yield* app.api.changes.observe({
		requestId: request("observe:same"),
		host: "github",
		observation: observed,
		attachment: { _tag: "Observed" },
		observedAt: new Date(4000).toISOString(),
	});
	expect(yield* app.rows.changeFeedback.count({ forwardedAt: null })).toBe(0);

	const edited = words.map((item) => (item.id === "r1" ? { ...item, body: "The empty reef needs two tests before this lands." } : item));
	yield* app.api.changes.observe({
		requestId: request("observe:edited"),
		host: "github",
		observation: { ...observed, activityAt: 5000, feedback: edited },
		attachment: { _tag: "Observed" },
		observedAt: new Date(6000).toISOString(),
	});
	expect(yield* app.rows.changeFeedback.count({})).toBe(3);
	expect(yield* app.rows.changeFeedback.get("r1")).toMatchObject({ body: "The empty reef needs two tests before this lands.", forwardedAt: null });
});
