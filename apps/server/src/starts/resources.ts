import { plan as recordPlan } from "@antumbra/domain-reclamation/commands/plan.ts";
import { ready } from "@antumbra/domain-reclamation/commands/ready.ts";
import { berths } from "@antumbra/domain-reclamation/queries/berths.ts";
import { current } from "@antumbra/domain-reclamation/queries/moorage.ts";
import { repoSlug } from "@antumbra/domain-repos/ids.ts";
import { all as repos } from "@antumbra/domain-repos/queries/all.ts";
import type { start } from "@antumbra/domain-starts/rows/start.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { Moorage } from "@antumbra/platform-vocabulary/resources.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Layer, Option } from "effect";
import { StartExecution, StartHeld } from "#starts/execution.ts";

const prepare = Effect.fn("Starts.prepareResources")(function* (birth: typeof start.Row.Type, runnerId: string) {
	const live = yield* Live;
	const commit = yield* Commit;
	const runners = yield* RunnerOperations;
	const stored = yield* live.read(current, { agentId: birth.agentId });
	let plan: Moorage;
	if (Option.isSome(stored)) {
		if (stored.value.runner !== runnerId) return yield* new StartHeld({ reason: "The agent's resources belong to another runner" });
		plan = { root: stored.value.root, berths: yield* live.read(berths, { agentId: birth.agentId }) };
	} else {
		const registered = yield* live.read(repos, {});
		const result = yield* runners.execute(runnerId, {
			type: "Plan",
			requestId: `${birth.operationRequestId}:plan`,
			agentId: birth.agentId,
			repos: registered.map((repo) => ({ ref: repo.defaultRef, slug: repoSlug(repo.source), source: repo.source })),
		});
		if (result.type !== "MooragePlanned")
			return yield* new StartHeld({ reason: result.type === "Refused" ? result.reason : "Runner did not return a resource plan" });
		plan = result.plan;
	}
	yield* commit
		.commit(recordPlan, { requestId: Request.make(`${birth.operationRequestId}:plan`), agentId: birth.agentId, runner: runnerId, plan })
		.pipe(
			Effect.catchTag("AlreadyDone", () => Effect.void),
			Effect.mapError((failure) => new StartHeld({ reason: failure._tag })),
		);
	const result = yield* runners.execute(runnerId, {
		type: "Provision",
		requestId: `${birth.operationRequestId}:provision`,
		agentId: birth.agentId,
		plan,
	});
	if (result.type === "Refused") return yield* new StartHeld({ reason: result.reason });
	yield* commit.commit(ready, { requestId: Request.make(`${birth.operationRequestId}:ready`), agentId: birth.agentId }).pipe(
		Effect.catchTag("AlreadyDone", () => Effect.void),
		Effect.mapError((failure) => new StartHeld({ reason: failure._tag })),
	);
	return plan.root;
});

export const resources = Layer.effect(
	StartExecution,
	Effect.gen(function* () {
		const live = yield* Live;
		const commit = yield* Commit;
		const runners = yield* RunnerOperations;
		return {
			prepare: (birth, runnerId) =>
				prepare(birth, runnerId).pipe(
					Effect.provideService(Live, live),
					Effect.provideService(Commit, commit),
					Effect.provideService(RunnerOperations, runners),
				),
		};
	}),
);
