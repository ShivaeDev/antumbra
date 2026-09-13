import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { ChangeId } from "#ids.ts";
import { adoption, chartering, opening, recorded, registration, request, seen } from "#test/kit.ts";

const DAY_MILLIS = 24 * 60 * 60 * 1000;
const REMAINING_MILLIS = 5_000;
const shoal = { ...seen("open"), externalId: "42", headRef: "work/shoal" };

it.app("archives a landed change once seven days have passed and leaves a younger one at the quay", function* (app) {
	yield* app.api.voyages.open(opening);
	yield* app.api.pieces.charter(chartering);
	yield* app.api.repos.register(registration);
	yield* app.api.changes.adopt(adoption);
	yield* app.api.changes.adopt({ ...adoption, requestId: request("change:shoal"), observation: shoal });
	const older = ChangeId.make(adoption.requestId);
	const younger = ChangeId.make(request("change:shoal"));
	yield* app.api.changes.observe({
		requestId: request("observe:reef"),
		host: "github",
		observation: seen("landed", 3000),
		attachment: { _tag: "Observed" },
		observedAt: yield* recorded(7 * DAY_MILLIS - REMAINING_MILLIS),
	});
	yield* app.api.changes.observe({
		requestId: request("observe:shoal"),
		host: "github",
		observation: { ...shoal, stage: "landed", activityAt: 3000 },
		attachment: { _tag: "Observed" },
		observedAt: yield* recorded(6 * DAY_MILLIS),
	});
	const landed = yield* eventually(app.api.changes.quay({}), (rows) => rows.length === 2);
	expect(landed.map((row) => row.group)).toEqual(["landed", "landed"]);

	yield* app.clock.advance(REMAINING_MILLIS);
	const quay = yield* eventually(app.api.changes.quay({}), (rows) => rows.some((row) => row.group === "archived"));
	expect(quay.find((row) => row.id === older)).toMatchObject({ group: "archived", stage: "landed" });
	expect(quay.find((row) => row.id === younger)).toMatchObject({ group: "landed", stage: "landed" });

	const waiting = yield* answered(app.api.changes.browse({ query: "", repositoryId: null, status: "all", selectedId: null }));
	expect(waiting).toMatchObject({ rows: [{ id: younger }], total: 2, waiting: 0 });
	const archived = yield* answered(app.api.changes.browse({ query: "", repositoryId: null, status: "archived", selectedId: null }));
	expect(archived.rows).toMatchObject([{ id: older }]);

	const archivedAt = (yield* app.rows.change.get(older)).archivedAt;
	expect(archivedAt).not.toBeNull();
	yield* app.clock.advance(REMAINING_MILLIS);
	expect(yield* Effect.flip(app.commit.changes.archive({ changeId: older, requestId: request(`archive:${older}`) }))).toMatchObject({
		_tag: "AlreadyDone",
	});
	expect((yield* app.rows.change.get(older)).archivedAt).toBe(archivedAt);
});
