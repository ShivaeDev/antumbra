import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { ChangeId } from "#ids.ts";
import { adoption, chartering, opening, registration, request, seen } from "#test/kit.ts";

const recordedDaysAgo = (days: number): string => new Date(-days * 24 * 60 * 60 * 1000).toISOString();
const shoal = { ...seen("open"), externalId: "42", headRef: "work/shoal" };

it.app("archives a change seven days after Antumbra recorded it landing and keeps a younger one at the quay", function* (app) {
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
		observedAt: recordedDaysAgo(7),
	});
	yield* app.api.changes.observe({
		requestId: request("observe:shoal"),
		host: "github",
		observation: { ...shoal, stage: "landed", activityAt: 3000 },
		attachment: { _tag: "Observed" },
		observedAt: recordedDaysAgo(6),
	});

	const quay = yield* eventually(app.api.changes.quay({}), (rows) => rows.some((row) => row.group === "archived"));
	expect(quay.find((row) => row.id === older)).toMatchObject({ group: "archived", stage: "landed" });
	expect(quay.find((row) => row.id === younger)).toMatchObject({ group: "landed", stage: "landed" });

	const waiting = yield* answered(app.api.changes.browse({ query: "", repositoryId: null, status: "all", selectedId: null }));
	expect(waiting).toMatchObject({ rows: [{ id: younger }], total: 2, waiting: 0 });
	const archived = yield* answered(app.api.changes.browse({ query: "", repositoryId: null, status: "archived", selectedId: null }));
	expect(archived.rows).toMatchObject([{ id: older }]);

	const archivedAt = (yield* app.rows.change.get(older)).archivedAt;
	expect(archivedAt).not.toBeNull();
	yield* app.clock.advance(5_000);
	expect(yield* Effect.flip(app.commit.changes.archive({ changeId: older, requestId: request(`archive:${older}`) }))).toMatchObject({
		_tag: "AlreadyDone",
	});
	expect((yield* app.rows.change.get(older)).archivedAt).toBe(archivedAt);
});
