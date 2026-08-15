import { defineIntent } from "@antumbra/kernel";
import { Effect, Option, Schema } from "effect";
import { makeCaptainToolCompiler } from "#captain-tools.ts";
import { deliverCharterOnce } from "#charter.ts";
import { crewTools } from "#crew-tools.ts";
import type { AgentDeps } from "#deps.ts";
import { UnknownBackendTag, UnknownRunnerTag } from "#errors.ts";
import { recordMoorage } from "#moorage-rows.ts";
import { berthRequests } from "#registry.ts";
import {
	activateAgent,
	ensureAgentRow,
	settleSpawnFailure,
} from "#spawn-rows.ts";
import { CAPTAIN_ROLE } from "#voyage-captain.ts";

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
	// why: a captain answers to a voyage rather than to one of its pieces, so
	// the crew row is written in the same act as the birth.
	voyageId: Schema.optionalKey(Schema.String),
});
export type SpawnFields = typeof SpawnPayload.Type;

const sessionIdentity = (payload: SpawnFields) => ({
	agentId: payload.agentId,
	pieceId: Option.fromUndefinedOr(payload.pieceId),
	sessionId: payload.sessionId,
	voyageId: Option.fromUndefinedOr(payload.voyageId),
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

export const makeSpawnKind = Effect.gen(function* () {
	const compileCaptainTools = yield* makeCaptainToolCompiler;
	return (deps: AgentDeps) => {
		// why: the session's tools are bound to this agent, this session, and what
		// it answers to. Capability effects are closed here, before the callbacks
		// cross into the provider SDK.
		const toolsFor = (payload: SpawnFields) => {
			const identity = sessionIdentity(payload);
			return payload.role === CAPTAIN_ROLE && Option.isSome(identity.voyageId)
				? compileCaptainTools(deps, identity)
				: crewTools(deps, identity);
		};
		const spawnAgent = (payload: SpawnFields) =>
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
						tools: toolsFor(payload),
					},
					sink,
				);
				yield* deliverCharterOnce(deps, payload, handle);
				yield* activateAgent(deps, payload.agentId);
			});

		return defineIntent({
			execute: (payload) =>
				spawnAgent(payload).pipe(
					Effect.onError(() => settleAfterFailure(deps, payload)),
				),
			payload: SpawnPayload,
			// why: a stranded spawn's agent goes dormant at boot; requeueing it would
			// be revival, which v0 deliberately does not have.
			reclaim: "abandon",
			tag: "agent/spawn",
		});
	};
});
