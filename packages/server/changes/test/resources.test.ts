import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import type { ChangeEvidence } from "@antumbra/platform-vocabulary/changes-event.ts";
import { BerthId } from "@antumbra/platform-vocabulary/reclamation-ids.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";
import { adoption, chartering, opening, registration, request } from "#test/kit.ts";

const evidence: typeof ChangeEvidence.Type = {
	agents: [
		{
			id: AgentId.make("old-owner"),
			role: "hand",
			status: "retired",
			currentSessionId: null,
			createdAt: "1970-01-01T00:00:00.000Z",
			updatedAt: "1970-01-01T00:00:00.000Z",
		},
	],
	owners: [{ agentId: "old-owner", status: "retired", openSessions: 0 }],
	berths: [
		{
			id: BerthId.make("old-owner:reef"),
			agentId: "old-owner",
			runner: "local",
			source: registration.source,
			slug: "reef",
			ref: "main",
			branch: "work/reef",
			path: "/reef",
			status: "ready",
			reclaimRequestId: null,
			reclaimResult: null,
			reclaimState: null,
			strandedAt: null,
		},
	],
	moorages: [{ agentId: "old-owner", runner: "local", root: "/moorage", status: "ready", reclaimState: null }],
	sessions: [],
	assignments: [],
	activities: [],
	captains: [],
};
postgresApp.it(
	"holds retired resources until terminal Change evidence commits and discards rollback",
	[],
	function* ({ api, changesHistory, transaction, rollback, clearPublished, published }) {
		yield* api["voyages.open"](opening);
		yield* api["pieces.charter"](chartering);
		yield* api["repos.register"](registration);
		yield* changesHistory.append(request("resource-evidence"), [{ _tag: "ChangeEvidenceObserved", ...evidence, at: 0 }]);
		expect(yield* api["changes.cleanupCandidates"]({})).toMatchObject([{ agentId: "old-owner" }]);
		yield* api["changes.adopt"](adoption);
		expect(yield* api["changes.cleanupCandidates"]({})).toEqual([]);
		const before = (yield* api["changes.all"]({}))[0];
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
		expect(yield* api["changes.cleanupCandidates"]({})).toEqual([]);
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
		expect((yield* api["changes.all"]({}))[0]?.stage).toBe("open");
		expect(yield* api["changes.cleanupCandidates"]({})).toEqual([]);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* api["changes.cleanupCandidates"]({})).toMatchObject([{ agentId: "old-owner" }]);
		expect(yield* published()).toContain("heldResource");
	},
);
