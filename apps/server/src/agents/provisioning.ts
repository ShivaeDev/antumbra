import { BirthHeld, Provisioning } from "@antumbra/domain-agents/ports/provisioning.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import type { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { repoSlug } from "@antumbra/platform-vocabulary/repos-ids.ts";
import type { Moorage } from "@antumbra/platform-vocabulary/resources.ts";
import { Reclamation } from "@antumbra/server-reclamation/service.ts";
import { Repos } from "@antumbra/server-repos/service.ts";
import { Effect, Layer, Option } from "effect";

const prepare = Effect.fn("Agents.prepareMoorage")(function* (agentId: AgentId, requestId: Request, runnerId: string) {
	const reclamationService = yield* Reclamation;
	const reposService = yield* Repos;

	const runners = yield* RunnerOperations;
	const stored = yield* reclamationService.current({ agentId }).pipe(Effect.orDie);
	let plan: Moorage;
	if (Option.isSome(stored)) {
		if (stored.value.runner !== runnerId) return yield* new BirthHeld({ reason: "The agent's resources belong to another runner" });
		plan = { root: stored.value.root, berths: yield* reclamationService.berths({ agentId }).pipe(Effect.orDie) };
	} else {
		const registered = yield* reposService.all({}).pipe(Effect.orDie);
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
	yield* reclamationService.plan({ requestId: Request.make(`${requestId}:plan`), agentId, runner: runnerId, plan }).pipe(
		Effect.catchTag("AlreadyDone", () => Effect.void),
		Effect.mapError((failure) => new BirthHeld({ reason: failure._tag })),
	);
	const result = yield* runners.execute(runnerId, { type: "Provision", requestId: `${requestId}:provision`, agentId, plan });
	if (result.type === "Refused") return yield* new BirthHeld({ reason: result.reason });
	yield* reclamationService.ready({ requestId: Request.make(`${requestId}:provision`), agentId }).pipe(
		Effect.catchTag("AlreadyDone", () => Effect.void),
		Effect.mapError((failure) => new BirthHeld({ reason: failure._tag })),
	);
	return plan.root;
});

export const provisioning = Layer.effect(
	Provisioning,
	Effect.gen(function* () {
		const context = yield* Effect.context<Effect.Services<ReturnType<typeof prepare>>>();
		return {
			prepare: (agentId, requestId, runnerId) => prepare(agentId, requestId, runnerId).pipe(Effect.provideContext(context)),
		};
	}),
);
