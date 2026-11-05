import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";
import { adoption, chartering, opening, registration, request } from "#test/kit.ts";

postgresApp.it(
	"holds retired resources until terminal Change evidence commits and discards rollback",
	[],
	function* ({ api, retiredBerth, changesHistory, transaction, rollback, clearPublished, published }) {
		yield* api["voyages.open"](opening);
		yield* api["pieces.charter"](chartering);
		yield* api["repos.register"](registration);
		const owner = yield* retiredBerth(registration.source, "work/reef");
		expect(yield* answered(api["changes.cleanupCandidates"]({}), "changes.cleanupCandidates")).toMatchObject([{ agentId: owner }]);
		yield* api["changes.adopt"](adoption);
		expect(yield* answered(api["changes.cleanupCandidates"]({}), "changes.cleanupCandidates")).toEqual([]);
		const before = (yield* answered(api["changes.all"]({}), "changes.all"))[0];
		if (before === undefined) return yield* Effect.die(new Error("adopted Change missing"));
		const event = {
			_tag: "ChangeObserved" as const,
			change: { ...before, stage: "landed" as const, landedAt: new Date(3000).toISOString(), activityAt: new Date(3000).toISOString() },
			transition: null,
			feedback: [],
			at: 0,
		};
		yield* clearPublished();
		yield* rollback(changesHistory.append(request("rollback"), [event]));
		expect(yield* answered(api["changes.cleanupCandidates"]({}), "changes.cleanupCandidates")).toEqual([]);
		expect(yield* published()).toEqual([]);
		const written = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const pending = yield* transaction(
			Effect.gen(function* () {
				yield* changesHistory.append(request("terminal"), [event]);
				yield* Deferred.succeed(written, undefined);
				yield* Deferred.await(release);
			}),
		).pipe(Effect.forkScoped);
		yield* Deferred.await(written);
		expect((yield* answered(api["changes.all"]({}), "changes.all"))[0]?.stage).toBe("open");
		expect(yield* answered(api["changes.cleanupCandidates"]({}), "changes.cleanupCandidates")).toEqual([]);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* answered(api["changes.cleanupCandidates"]({}), "changes.cleanupCandidates")).toMatchObject([{ agentId: owner }]);
		expect(yield* published()).toContain("heldResource");
	},
);
