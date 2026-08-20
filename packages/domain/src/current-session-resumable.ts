import { Database } from "@antumbra/persistence";
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

const heldInvalid = (failure: { readonly message: string }) =>
	recoveryHeld(failure.message);

export const makeCurrentSessionResumable = Effect.gen(function* () {
	const db = yield* Database;
	const loadRows = (sessionId: string) =>
		Effect.gen(function* () {
			const stored = yield* db.AgentSession.where({ id: sessionId }).first();
			if (Option.isNone(stored)) {
				return Option.none();
			}
			const agent = yield* db.Agent.where({ id: stored.value.agentId }).first();
			return Option.isNone(agent)
				? Option.none()
				: Option.some({ agent: agent.value, session: stored.value });
		});
	type LoadedRows =
		Effect.Success<ReturnType<typeof loadRows>> extends Option.Option<
			infer Rows
		>
			? Rows
			: never;
	const applyRepair = (
		agent: LoadedRows["agent"],
		plan: CurrentSessionReconcilePlan,
	) =>
		Effect.gen(function* () {
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
			return {
				changed: plan.pointers.length > 0 || plan.sessionsToClose.length > 0,
				currentSessionId:
					agent.currentSessionId ?? plan.pointers[0]?.currentSessionId ?? null,
			};
		});
	// why: a Session settling into siesta is finishing its execution rather than
	// holding one open, so it is the one open Session a resume may not take.
	const resumableExecution = (
		session: LoadedRows["session"],
		changed: boolean,
	) =>
		Effect.gen(function* () {
			const execution = yield* Effect.fromResult(
				decodeSessionExecutionStatus(session.id, session.executionStatus),
			);
			return {
				changed,
				session:
					execution === "draining" ? Option.none() : Option.some(session),
			};
		});
	return (sessionId: string) =>
		Effect.gen(function* () {
			const loaded = yield* loadRows(sessionId);
			if (Option.isNone(loaded)) {
				return { changed: false, session: Option.none() };
			}
			const { agent, session } = loaded.value;
			const status = yield* Effect.fromResult(
				decodeStoredAgentStatus(agent.id, agent.status),
			).pipe(Effect.mapError(heldInvalid));
			if (status !== "alive") {
				return { changed: false, session: Option.none() };
			}
			const planned = planCurrentSessionReconciliation(
				[agent],
				yield* db.AgentSession.where({ agentId: agent.id }).all(),
			);
			if (Result.isFailure(planned)) {
				return yield* heldInvalid(planned.failure);
			}
			const repaired = yield* applyRepair(agent, planned.success);
			return repaired.currentSessionId === sessionId
				? yield* resumableExecution(session, repaired.changed)
				: { changed: repaired.changed, session: Option.none() };
		});
});
