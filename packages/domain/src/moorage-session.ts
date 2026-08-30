import { DomainFeeds } from "@antumbra/domain-feeds";
import {
	Database,
	type NewAgentSession,
	type PrismaError,
} from "@antumbra/persistence";
import type { MooragePlan } from "@antumbra/plugin-api";
import { ensureAgentCanOwnLocalWork } from "@antumbra/resource-reclamation";
import { openSessions, rootSessionsOf } from "@antumbra/sessions";
import { decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import {
	AgentNotFound,
	AgentRootAlreadyOpen,
	AgentSessionConflict,
} from "#errors.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const makeEnsureSessionRow = Effect.gen(function* () {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const conflict = (payload: SpawnFields, currentSessionId: string | null) =>
		new AgentSessionConflict({
			agentId: payload.agentId,
			currentSessionId,
			sessionId: payload.sessionId,
		});
	// why: a replayed birth finds the row its earlier attempt wrote. It is this
	// spawn's own only if the Agent owns it and it is still open; anything else
	// under the same id belongs to a Session this spawn may not adopt.
	const alreadyOpened = (
		payload: SpawnFields,
		currentSessionId: string | null,
	) =>
		Effect.gen(function* () {
			const session = yield* db.AgentSession.where({
				id: payload.sessionId,
			}).first();
			if (Option.isNone(session)) {
				return false;
			}
			const status = yield* Effect.fromResult(
				decodeStoredAgentSessionStatus(session.value.id, session.value.status),
			);
			return session.value.agentId === payload.agentId && status === "open"
				? true
				: yield* conflict(payload, currentSessionId);
		});
	// why: one open root per Agent is a rule the database also holds, as a
	// partial unique index. Left to the index it arrives as a constraint
	// violation with a redacted driver message behind it, which reaches the
	// reader as an Intent that failed for no stated reason — so the rule is read
	// first and refused by name, pointing at the Session already open.
	const refuseSecondRoot = (payload: SpawnFields) =>
		Effect.gen(function* () {
			const openRoot = yield* db.AgentSession.where({
				...rootSessionsOf(payload.agentId),
				...openSessions,
			}).first();
			if (Option.isSome(openRoot)) {
				return yield* new AgentRootAlreadyOpen({
					agentId: payload.agentId,
					openSessionId: openRoot.value.id,
					sessionId: payload.sessionId,
				});
			}
		});
	const recoverSessionCreate = (
		payload: SpawnFields,
		currentSessionId: string | null,
		failure: PrismaError,
	) =>
		Effect.gen(function* () {
			if (yield* alreadyOpened(payload, currentSessionId)) {
				return false;
			}
			yield* refuseSecondRoot(payload);
			return yield* failure;
		});
	const ensureSession = (payload: SpawnFields, plan: MooragePlan) =>
		Effect.gen(function* () {
			const agent = yield* db.Agent.where({ id: payload.agentId }).first();
			if (Option.isNone(agent)) {
				return yield* new AgentNotFound({ agentId: payload.agentId });
			}
			const currentSessionId = agent.value.currentSessionId;
			if (currentSessionId !== payload.sessionId) {
				return yield* conflict(payload, currentSessionId);
			}
			if (yield* alreadyOpened(payload, currentSessionId)) {
				return false;
			}
			yield* refuseSecondRoot(payload);
			// why: a spawn opens a root — no parent, and it roots its own tree.
			// Subsession rows are born by the tree's own creator, never here.
			return yield* db.AgentSession.create({
				agentId: payload.agentId,
				backend: payload.backend,
				charterDeliveredAt: null,
				completeness: "recording",
				cwd: plan.root,
				executionStatus: "active",
				id: payload.sessionId,
				kind: null,
				label: null,
				nativeRef: null,
				outcome: null,
				parentSessionId: null,
				rootSessionId: payload.sessionId,
				status: "open",
			} satisfies NewAgentSession).pipe(
				Effect.as(true),
				Effect.catchTag("PrismaError", (failure) =>
					recoverSessionCreate(payload, currentSessionId, failure),
				),
			);
		});
	return (payload: SpawnFields, plan: MooragePlan) =>
		Effect.gen(function* () {
			const created = yield* ensureAgentCanOwnLocalWork(payload.agentId).pipe(
				Effect.provideService(Database, db),
				Effect.andThen(ensureSession(payload, plan)),
			);
			if (created) {
				yield* feeds.publishFleetRefresh();
				yield* feeds.publishVoyageRefresh();
			}
		});
});
