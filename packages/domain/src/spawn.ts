import { defineIntent } from "@antumbra/kernel";
import { Effect, Option, Schema } from "effect";
import { deliverCharterOnce } from "#charter.ts";
import type { AgentDeps } from "#deps.ts";
import { UnknownBackendTag, UnknownRunnerTag } from "#errors.ts";
import { berthRequests } from "#registry.ts";
import {
	activateAgent,
	ensureAgentRow,
	recordMoorage,
	settleSpawnFailure,
} from "#spawn-rows.ts";

const SpawnPayload = Schema.Struct({
	agentId: Schema.String,
	backend: Schema.String,
	charter: Schema.String,
	// why: crew spawned for a piece carries the piece it answers to, so the
	// assignment is written in the same act as the birth; a hand spawned from
	// the fleet view answers to no piece and omits it.
	pieceId: Schema.optionalKey(Schema.String),
	role: Schema.String,
	runner: Schema.String,
	sessionId: Schema.String,
});
export type SpawnFields = typeof SpawnPayload.Type;

const spawnAgent = (deps: AgentDeps, payload: SpawnFields) =>
	Effect.gen(function* () {
		const backend = deps.backends.get(payload.backend);
		if (backend === undefined) {
			return yield* new UnknownBackendTag({ tag: payload.backend });
		}
		const runner = deps.runners.get(payload.runner);
		if (runner === undefined) {
			return yield* new UnknownRunnerTag({ tag: payload.runner });
		}
		yield* ensureAgentRow(deps, payload);
		// why: the moorage exists before the session opens — the agent is never
		// the one creating its own worktrees — and it holds a berth for every
		// registered repo, read now rather than at submit.
		const moorage = yield* runner.provision({
			agentId: payload.agentId,
			repos: yield* berthRequests(deps),
		});
		yield* recordMoorage(deps, payload, moorage);
		const sink = yield* deps.sinkFor(payload.sessionId);
		const handle = yield* deps.fabric.start(
			backend,
			{
				cwd: moorage.root,
				resume: Option.none(),
				sessionId: payload.sessionId,
			},
			sink,
		);
		yield* deliverCharterOnce(deps, payload, handle);
		yield* activateAgent(deps, payload.agentId);
	});

const settleAfterFailure = (deps: AgentDeps, payload: SpawnFields) =>
	settleSpawnFailure(deps, payload).pipe(
		Effect.catchCause((cause) =>
			Effect.logWarning(
				"spawn failure settlement failed",
				{ agentId: payload.agentId },
				cause,
			),
		),
	);

export const makeSpawnKind = (deps: AgentDeps) =>
	defineIntent({
		execute: (payload) =>
			spawnAgent(deps, payload).pipe(
				Effect.onError(() => settleAfterFailure(deps, payload)),
			),
		payload: SpawnPayload,
		// why: a stranded spawn's agent goes dormant at boot; requeueing it would
		// be revival, which v0 deliberately does not have.
		reclaim: "abandon",
		tag: "agent/spawn",
	});
