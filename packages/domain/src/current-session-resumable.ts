import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	decodeSessionExecutionStatus,
	decodeStoredAgentStatus,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, Result } from "effect";
import {
	type CurrentSessionReconcilePlan,
	planCurrentSessionReconciliation,
} from "#current-session-reconcile-plan.ts";
import { recoveryHeld } from "#session-recovery-error.ts";
import { rootSessions, rootSessionsOf } from "#session-roots.ts";
import type { SessionUnresumable } from "#session-unresumable.ts";

const heldInvalid = (failure: { readonly message: string }) =>
	recoveryHeld(failure.message);

export const makeCurrentSessionResumable = Effect.gen(function* () {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const loadRows = (sessionId: string) =>
		Effect.gen(function* () {
			const stored = yield* db.AgentSession.where({
				id: sessionId,
				...rootSessions,
			}).first();
			if (Option.isNone(stored)) {
				return Result.fail<SessionUnresumable>({ _tag: "no-root" });
			}
			const agentId = stored.value.agentId;
			const agent = yield* db.Agent.where({ id: agentId }).first();
			return Option.isNone(agent)
				? Result.fail<SessionUnresumable>({ _tag: "no-agent", agentId })
				: Result.succeed({ agent: agent.value, session: stored.value });
		});
	type LoadedRows =
		Effect.Success<ReturnType<typeof loadRows>> extends Result.Result<
			infer Rows,
			SessionUnresumable
		>
			? Rows
			: never;
	const applyRepair = (
		agent: LoadedRows["agent"],
		plan: CurrentSessionReconcilePlan,
	) =>
		Effect.gen(function* () {
			// why: resume applies the same repair boot does, from the same plan —
			// an Agent with nothing open is reclaimed here too, and the resume it
			// was asked for then finds no Session to take, which is the truth.
			yield* Effect.forEach(
				plan.agentsToReclaim,
				(reclaimed) =>
					db.Agent.where({ id: reclaimed.agentId }).update({
						currentSessionId: null,
						status: reclaimed.status,
					}),
				{ discard: true },
			);
			yield* Effect.forEach(
				plan.pointers,
				(pointer) =>
					db.Agent.where({
						currentSessionId: null,
						id: pointer.agentId,
					}).update({ currentSessionId: pointer.currentSessionId }),
				{ discard: true },
			);
			yield* Effect.forEach(
				plan.sessionsToClose,
				(id) => db.AgentSession.where({ id }).update({ status: "closed" }),
				{ discard: true },
			);
			yield* Effect.forEach(
				plan.executionsToSettle,
				(settled) =>
					db.AgentSession.where({
						executionStatus: "draining",
						id: settled.sessionId,
					}).update({ executionStatus: settled.executionStatus }),
				{ discard: true },
			);
			return {
				changed:
					plan.agentsToReclaim.length > 0 ||
					plan.executionsToSettle.length > 0 ||
					plan.pointers.length > 0 ||
					plan.sessionsToClose.length > 0,
				currentSessionId:
					agent.currentSessionId ?? plan.pointers[0]?.currentSessionId ?? null,
			};
		});
	// why: a Session settling into siesta is finishing its execution rather than
	// holding one open, so it is the one open Session a resume may not take —
	// unless the plan just settled it, in which case the drain belonged to a
	// process that is gone and the row read a moment ago is already stale.
	const resumableExecution = (
		session: LoadedRows["session"],
		plan: CurrentSessionReconcilePlan,
		changed: boolean,
	) =>
		Effect.gen(function* () {
			const settled = plan.executionsToSettle.find(
				(candidate) => candidate.sessionId === session.id,
			);
			const execution =
				settled === undefined
					? yield* Effect.fromResult(
							decodeSessionExecutionStatus(session.id, session.executionStatus),
						)
					: settled.executionStatus;
			return {
				changed,
				session:
					execution === "draining"
						? Result.fail<SessionUnresumable>({ _tag: "draining" })
						: Result.succeed(session),
			};
		});
	return (sessionId: string) =>
		Effect.gen(function* () {
			const loaded = yield* loadRows(sessionId);
			if (Result.isFailure(loaded)) {
				return { changed: false, session: Result.fail(loaded.failure) };
			}
			const { agent, session } = loaded.success;
			const status = yield* Effect.fromResult(
				decodeStoredAgentStatus(agent.id, agent.status),
			).pipe(Effect.mapError(heldInvalid));
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
				yield* fabric.attached,
			);
			if (Result.isFailure(planned)) {
				return yield* heldInvalid(planned.failure);
			}
			const repaired = yield* applyRepair(agent, planned.success);
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
