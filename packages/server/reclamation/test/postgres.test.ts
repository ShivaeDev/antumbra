import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { berthId, reclaimRequestId } from "@antumbra/platform-vocabulary/reclamation-ids.ts";
import { Effect, Fiber } from "effect";
import { expect } from "vitest";

const birth = Request.make("worker");
const { agentId } = identity(birth);
const plan = {
	agentId,
	runner: "runner",
	plan: { root: "/moorage", berths: [{ slug: "repo", source: "/repo", ref: "main", branch: "work/test", path: "/moorage/repo" }] },
};
postgresApp.it(
	"replays resource history and guards concurrent claims and stale results",
	[],
	function* ({ journal, replayJournal, api, holdWrite, rebuild, rollback, clearPublished, published }) {
		const legacy = yield* journal();
		yield* legacy.api.agents.spawn({ requestId: birth, role: "hand", backend: "claude", model: null, effort: null });
		yield* legacy.api.reclamation.plan({ ...plan, requestId: Request.make("plan") });
		yield* legacy.api.reclamation.ready({ agentId, requestId: Request.make("ready") });
		yield* legacy.api.agents.retire({ id: agentId, requestId: Request.make("retire") });
		yield* replayJournal(legacy);
		expect(yield* api["reclamation.candidates"]({})).toEqual(yield* answered(legacy.api.reclamation.candidates({}), "journal candidates"));
		const id = berthId(agentId, "repo");
		const claim = Request.make("claim");
		yield* clearPublished();
		const held = yield* holdWrite(api["reclamation.claim"]({ agentId, requestId: claim }));
		const replan = yield* Effect.flip(api["reclamation.claim"]({ agentId, requestId: Request.make("second-claim") })).pipe(Effect.forkScoped);
		expect(yield* held.blocked()).not.toHaveLength(0);
		expect(yield* published()).toEqual([]);
		yield* held.commit();
		expect(yield* Fiber.join(replan)).toMatchObject({ _tag: "NothingToReclaim" });
		expect(
			yield* Effect.flip(api["reclamation.reclaimed"]({ id, claimRequestId: Request.make("stale"), requestId: Request.make("old-result") })),
		).toMatchObject({ _tag: "StaleClaim" });
		const claimId = reclaimRequestId(claim, id);
		yield* rollback(api["reclamation.held"]({ id, claimRequestId: claimId, reason: "Unpushed commits", requestId: Request.make("rollback") }));
		expect(yield* api["reclamation.berths"]({ agentId })).toMatchObject([{ reclaimState: "claimed", reclaimResult: null }]);
		yield* api["reclamation.held"]({ id, claimRequestId: claimId, reason: "Unpushed commits", requestId: Request.make("held") });
		const stranded = yield* api["reclamation.berths"]({ agentId });
		expect(stranded).toMatchObject([{ status: "stranded", reclaimState: "claimed" }]);
		yield* rebuild();
		expect(yield* api["reclamation.berths"]({ agentId })).toEqual(stranded);
		expect(yield* api["agents.byId"]({ id: agentId })).toMatchObject({ status: "retired" });
	},
);
