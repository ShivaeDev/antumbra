import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { decodeSessionExecutionStatus, decodeStoredAgentSessionStatus, decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, Result } from "effect";
import { type CurrentSessionReconcilePlan, planCurrentSessionReconciliation } from "#current/reconcile-plan.ts";
import { makeCurrentSessionRepair } from "#current/repair.ts";
import { recoveryHeld } from "#recovery/error.ts";
import { rootSessions, rootSessionsOf } from "#roots.ts";
import type { SessionUnresumable } from "#unresumable.ts";

const heldInvalid = (failure: { readonly message: string }) => recoveryHeld(failure.message);

export const makeCurrentSessionResumable = Effect.gen(function* () {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const applyRepair = yield* makeCurrentSessionRepair;
	const loadRows = (sessionId: string) =>
		Effect.gen(function* () {
			const stored = yield* db.AgentSession.where({
				id: sessionId,
				...rootSessions,
			}).first();
			if (Option.isNone(stored)) {
				return Result.fail<SessionUnresumable>({ _tag: "no-root" });
			}
			const status = yield* Effect.fromResult(decodeStoredAgentSessionStatus(sessionId, stored.value.status)).pipe(Effect.mapError(heldInvalid));
			if (status !== "open") {
				return Result.fail<SessionUnresumable>({ _tag: "session-closed" });
			}
			const agentId = stored.value.agentId;
			const agent = yield* db.Agent.where({ id: agentId }).first();
			return Option.isNone(agent)
				? Result.fail<SessionUnresumable>({ _tag: "no-agent", agentId })
				: Result.succeed({ agent: agent.value, session: stored.value });
		});
	type LoadedRows = Effect.Success<ReturnType<typeof loadRows>> extends Result.Result<infer Rows, SessionUnresumable> ? Rows : never;
	const resumableExecution = (session: LoadedRows["session"], plan: CurrentSessionReconcilePlan, changed: boolean) =>
		Effect.gen(function* () {
			const settled = plan.executionsToSettle.find((candidate) => candidate.sessionId === session.id);
			const execution =
				settled === undefined ? yield* Effect.fromResult(decodeSessionExecutionStatus(session.id, session.executionStatus)) : settled.executionStatus;
			return {
				changed,
				session: execution === "draining" ? Result.fail<SessionUnresumable>({ _tag: "draining" }) : Result.succeed(session),
			};
		});
	return (sessionId: string) =>
		Effect.gen(function* () {
			const loaded = yield* loadRows(sessionId);
			if (Result.isFailure(loaded)) {
				return { changed: false, session: Result.fail(loaded.failure) };
			}
			const { agent, session } = loaded.success;
			const status = yield* Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status)).pipe(Effect.mapError(heldInvalid));
			if (status !== "alive") {
				return {
					changed: false,
					session: Result.fail<SessionUnresumable>({
						_tag: "agent-not-alive",
						agentId: agent.id,
						status,
					}),
				};
			}
			const planned = planCurrentSessionReconciliation(
				[agent],
				yield* db.AgentSession.where(rootSessionsOf(agent.id)).all(),
				yield* fabric.attached(),
			);
			if (Result.isFailure(planned)) {
				return yield* heldInvalid(planned.failure);
			}
			const repaired = yield* applyRepair(agent.currentSessionId, planned.success);
			return repaired.currentSessionId === sessionId
				? yield* resumableExecution(session, planned.success, repaired.changed)
				: {
						changed: repaired.changed,
						session: Result.fail<SessionUnresumable>({
							_tag: "not-current",
							currentSessionId: repaired.currentSessionId,
						}),
					};
		});
});
