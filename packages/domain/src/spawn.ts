import { defineIntent } from "@antumbra/kernel";
import { Effect, Option, PubSub, Schema } from "effect";
import { deliverCharterOnce } from "#charter.ts";
import type { AgentDeps } from "#deps.ts";
import { UnknownBackendTag, UnknownRunnerTag } from "#errors.ts";
import { ensureAgentRow, recordMoorage } from "#spawn-rows.ts";

const RepoField = Schema.Struct({
	ref: Schema.String,
	source: Schema.String,
});

const SpawnPayload = Schema.Struct({
	agentId: Schema.String,
	backend: Schema.String,
	charter: Schema.String,
	repos: Schema.Array(RepoField),
	role: Schema.String,
	runner: Schema.String,
	sessionId: Schema.String,
});
export type SpawnFields = typeof SpawnPayload.Type;

export const makeSpawnKind = (deps: AgentDeps) =>
	defineIntent({
		execute: (payload) =>
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
				// why: the moorage exists before the session opens — the agent is
				// never the one creating its own worktrees.
				const moorage = yield* runner.provision({
					agentId: payload.agentId,
					repos: payload.repos,
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
				yield* PubSub.publish(deps.feeds.fleet, undefined);
			}),
		payload: SpawnPayload,
		// why: a stranded spawn's agent goes dormant at boot; requeueing it would
		// be revival, which v0 deliberately does not have.
		reclaim: "abandon",
		tag: "agent/spawn",
	});
