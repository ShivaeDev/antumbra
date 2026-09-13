import type { AgentId } from "@antumbra/domain-agents/ids.ts";
import { BirthHeld, Provisioning } from "@antumbra/domain-agents/ports/provisioning.ts";
import { plan as recordPlan } from "@antumbra/domain-reclamation/commands/plan.ts";
import { ready } from "@antumbra/domain-reclamation/commands/ready.ts";
import { berths } from "@antumbra/domain-reclamation/queries/berths.ts";
import { current } from "@antumbra/domain-reclamation/queries/moorage.ts";
import { repoSlug } from "@antumbra/domain-repos/ids.ts";
import { all as repos } from "@antumbra/domain-repos/queries/all.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { Moorage } from "@antumbra/platform-vocabulary/resources.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Layer, Option } from "effect";

const prepare = Effect.fn("Agents.prepareMoorage")(function* (agentId: AgentId, requestId: Request, runnerId: string) {
	const live = yield* Live;
	const commit = yield* Commit;
	const runners = yield* RunnerOperations;
	const stored = yield* live.read(current, { agentId });
	let plan: Moorage;
	if (Option.isSome(stored)) {
		if (stored.value.runner !== runnerId) return yield* new BirthHeld({ reason: "The agent's resources belong to another runner" });
		plan = { root: stored.value.root, berths: yield* live.read(berths, { agentId }) };
	} else {
		const registered = yield* live.read(repos, {});
		const result = yield* runners.execute(runnerId, {
			type: "Plan",
			requestId: `${requestId}:plan`,
			agentId,
			repos: registered.map((repo) => ({ ref: repo.defaultRef, slug: repoSlug(repo.source), source: repo.source })),
		});
		if (result.type !== "MooragePlanned")
			return yield* new BirthHeld({ reason: result.type === "Refused" ? result.reason : "Runner did not return a resource plan" });
		plan = result.plan;
	}
	yield* commit.commit(recordPlan, { requestId: Request.make(`${requestId}:plan`), agentId, runner: runnerId, plan }).pipe(
		Effect.catchTag("AlreadyDone", () => Effect.void),
		Effect.mapError((failure) => new BirthHeld({ reason: failure._tag })),
	);
	const result = yield* runners.execute(runnerId, { type: "Provision", requestId: `${requestId}:provision`, agentId, plan });
	if (result.type === "Refused") return yield* new BirthHeld({ reason: result.reason });
	yield* commit.commit(ready, { requestId: Request.make(`${requestId}:provision`), agentId }).pipe(
		Effect.catchTag("AlreadyDone", () => Effect.void),
		Effect.mapError((failure) => new BirthHeld({ reason: failure._tag })),
	);
	return plan.root;
});

export const provisioning = Layer.effect(
	Provisioning,
	Effect.gen(function* () {
		const live = yield* Live;
		const commit = yield* Commit;
		const runners = yield* RunnerOperations;
		return {
			prepare: (agentId, requestId, runnerId) =>
				prepare(agentId, requestId, runnerId).pipe(
					Effect.provideService(Live, live),
					Effect.provideService(Commit, commit),
					Effect.provideService(RunnerOperations, runners),
				),
		};
	}),
);
