import { Database, type WriteExecutors } from "@antumbra/persistence";
import { Effect, Option, Schema } from "effect";
import { recoveryHeld } from "#session-recovery-error.ts";
import { AgentStatusSchema } from "#status.ts";

const SessionStatus = Schema.Literals(["open", "closed"]);
const ResourceStatus = Schema.Literals(["provisioning", "ready", "stranded"]);
const decodeSessionStatus = Schema.decodeUnknownOption(SessionStatus);
const decodeResourceStatus = Schema.decodeUnknownOption(ResourceStatus);
const decodeAgentStatus = Schema.decodeUnknownOption(AgentStatusSchema);

export const makeSessionRecoveryState = Effect.gen(function* () {
	const db = yield* Database;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const openSession = (sessionId: string) =>
		Effect.gen(function* () {
			const session = yield* provide(
				db.AgentSession.where({ id: sessionId }).first(),
			);
			if (Option.isNone(session)) {
				return session;
			}
			const status = decodeSessionStatus(session.value.status);
			if (Option.isNone(status)) {
				return yield* recoveryHeld(`${sessionId} has invalid Session status`);
			}
			return status.value === "open" ? session : Option.none();
		});
	const aliveAgent = (agentId: string, sessionId: string) =>
		Effect.gen(function* () {
			const agent = yield* provide(db.Agent.where({ id: agentId }).first());
			if (Option.isNone(agent)) {
				return agent;
			}
			const status = decodeAgentStatus(agent.value.status);
			if (Option.isNone(status)) {
				return yield* recoveryHeld(`${sessionId} has invalid Agent status`);
			}
			return status.value === "alive" ? agent : Option.none();
		});
	const ensureMoorage = (agentId: string, cwd: string, sessionId: string) =>
		Effect.gen(function* () {
			const moorage = yield* provide(db.Moorage.where({ agentId }).first());
			if (Option.isNone(moorage)) {
				return yield* recoveryHeld(
					`${sessionId} is waiting for its ready Moorage`,
				);
			}
			const status = decodeResourceStatus(moorage.value.status);
			if (Option.isNone(status)) {
				return yield* recoveryHeld(`${sessionId} has invalid Moorage status`);
			}
			if (status.value !== "ready" || moorage.value.root !== cwd) {
				return yield* recoveryHeld(
					`${sessionId} is waiting for its ready Moorage`,
				);
			}
		});
	const ensureBerths = (agentId: string, sessionId: string) =>
		Effect.gen(function* () {
			const berths = yield* provide(db.Berth.where({ agentId }).all());
			const statuses = berths.map((berth) =>
				decodeResourceStatus(berth.status),
			);
			if (statuses.some(Option.isNone)) {
				return yield* recoveryHeld(`${sessionId} has invalid Berth status`);
			}
			const notReady = statuses.some((status) =>
				Option.isSome(status) ? status.value !== "ready" : false,
			);
			if (notReady) {
				return yield* recoveryHeld(
					`${sessionId} is waiting for its ready Berths`,
				);
			}
		});
	return {
		aliveAgent,
		ensureResources: (agentId: string, cwd: string, sessionId: string) =>
			Effect.all(
				[
					ensureMoorage(agentId, cwd, sessionId),
					ensureBerths(agentId, sessionId),
				],
				{ concurrency: 1 },
			).pipe(Effect.asVoid),
		openSession,
	};
});
