import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { ChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { Clock, Effect } from "effect";
import { expect } from "vitest";
import { adoption, chartering, opening, registration, repoId, request, seen } from "#test/kit.ts";

const CHANGE = ChangeId.make(adoption.requestId);
const WEEK = 7 * 24 * 60 * 60 * 1000;
const hasRepository = postgresApp.trait("facts", "a chartered Piece has a registered repository", function* ({ api }) {
	yield* api["voyages.open"](opening);
	yield* api["pieces.charter"](chartering);
	yield* api["repos.register"](registration);
});
const landed = (ago: number) =>
	Effect.map(Clock.currentTimeMillis, (now) => ({
		...adoption,
		observation: seen("landed", now - ago),
		observedAt: new Date(now - ago).toISOString(),
	}));
const hasLandedChange = (ago: number) =>
	postgresApp.trait("facts", "the Piece has a landed Change", function* ({ api }) {
		yield* api["changes.adopt"](yield* landed(ago));
	});

postgresApp.it("archives an overdue Change on boot", [hasRepository, hasLandedChange(WEEK)], function* ({ reconciliation }) {
	const worker = yield* reconciliation.start;
	yield* worker.waiting;
	const quay = yield* reconciliation.archived(adoption.requestId);
	expect(quay).toEqual(expect.arrayContaining([expect.objectContaining({ id: adoption.requestId, group: "archived" })]));
});

postgresApp.it("archives a newly committed overdue Change", [hasRepository], function* ({ api, reconciliation }) {
	const worker = yield* reconciliation.start;
	yield* worker.waiting;
	yield* api["changes.adopt"](yield* landed(WEEK));
	const quay = yield* reconciliation.archived(adoption.requestId);
	expect(quay.find((row) => row.id === CHANGE)?.group).toBe("archived");
});

postgresApp.it("archives a Change when its due time arrives", [hasRepository, hasLandedChange(0)], function* ({ api, clock, reconciliation }) {
	const worker = yield* reconciliation.start;
	const waiting = yield* worker.waiting;
	expect(waiting).toEqual({ status: "waiting", nextDue: WEEK });
	yield* clock.advance(WEEK - 1);
	expect((yield* api["changes.quay"]({})).find((row) => row.id === CHANGE)?.group).toBe("landed");
	yield* clock.advance(1);
	expect((yield* reconciliation.archived(adoption.requestId)).find((row) => row.id === CHANGE)?.group).toBe("archived");
});

postgresApp.it("a rolled-back Change wakes no reconciliation", [hasRepository], function* ({ api, rollback, reconciliation }) {
	const worker = yield* reconciliation.start;
	yield* worker.waiting;
	const before = reconciliation.wakes();
	yield* rollback(api["changes.adopt"]({ ...(yield* landed(WEEK)), requestId: request("rolled-back") }));
	expect(reconciliation.wakes()).toBe(before);
	expect(yield* api["changes.all"]({})).toEqual([]);
});

postgresApp.it("removing eligibility interrupts owned Change work", [hasRepository, hasLandedChange(WEEK)], function* ({ api, reconciliation }) {
	const work = yield* reconciliation.claim;
	expect(yield* work.entered).toBe(CHANGE);
	yield* api["repos.forget"]({ id: repoId, requestId: request("forget") });
	expect(yield* work.interrupted).toBe(CHANGE);
	expect(yield* api["changes.all"]({})).toEqual([]);
});

postgresApp.it("owned Change work finishes while eligibility remains", [hasRepository, hasLandedChange(WEEK)], function* ({ reconciliation }) {
	const work = yield* reconciliation.claim;
	expect(yield* work.entered).toBe(CHANGE);
	yield* work.release;
	expect((yield* reconciliation.archived(CHANGE)).find((row) => row.id === CHANGE)?.group).toBe("archived");
});
