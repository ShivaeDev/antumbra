import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type NewAgentSession } from "@antumbra/persistence";
import { acquireTemporaryPersistence, type TemporaryPersistence } from "@antumbra/persistence/testing";
import type { SessionAudit, SessionCensus } from "@antumbra/plugin-api";
import { SessionEventJournalLive } from "@antumbra/session-event-journal";
import { SessionFabricLive } from "@antumbra/session-fabric";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Layer, Ref } from "effect";
import { LiveDelegationsLive } from "#tree/live.ts";

export const treeLayer = (temporary: TemporaryPersistence) =>
	SessionEventJournalLive.pipe(Layer.provideMerge(Layer.mergeAll(temporary.layer, DomainFeedsLive, LiveDelegationsLive, SessionFabricLive)));

export const treeTest = <A, E, R>(body: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		return yield* body.pipe(Effect.provide(treeLayer(temporary)));
	});

export interface SeededSession {
	readonly agentId: string;
	readonly completeness?: string;
	readonly id: string;
	readonly nativeRef?: string | null;
	readonly parentSessionId?: string | null;
	readonly rootSessionId: string;
	readonly status?: string;
}

export const seedAgent = (id: string, status = "alive", currentSessionId: string | null = null) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Agent.create({
			charter: `charter ${id}`,
			currentSessionId,
			id,
			role: "test hand",
			status,
		});
	});

export const seedSession = (session: SeededSession) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.AgentSession.create({
			agentId: session.agentId,
			backend: "scripted",
			charterDeliveredAt: null,
			completeness: session.completeness ?? "recording",
			createdAt: new Date(1),
			cwd: `/tmp/moorage/${session.agentId}`,
			executionStatus: "idle",
			id: session.id,
			kind: null,
			label: null,
			nativeRef: session.nativeRef ?? null,
			outcome: null,
			parentSessionId: session.parentSessionId ?? null,
			rootSessionId: session.rootSessionId,
			status: session.status ?? "open",
		} satisfies NewAgentSession);
	});

export const pointAgent = (id: string, currentSessionId: string | null) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Agent.where({ id }).update({ currentSessionId });
	});

export const sessionRow = (id: string) => Database.use((db) => db.AgentSession.where({ id }).first());

export const journalOf = (sessionId: string) =>
	Database.use((db) =>
		db.SessionEvent.where({ sessionId })
			.orderBy((event) => event.seq.asc())
			.all(),
	);

export interface ScriptedLane {
	readonly audit: SessionAudit;
	readonly readings: Effect.Effect<number>;
}

export const scriptedLane = (findings: ReadonlyArray<AgentEvent>) =>
	Effect.gen(function* () {
		const reads = yield* Ref.make(0);
		const audit: SessionAudit = {
			census: () => Effect.succeed({ events: [], nodes: [] }),
			node: () => Ref.update(reads, (count) => count + 1).pipe(Effect.as(findings)),
		};
		return { audit, readings: Ref.get(reads) } satisfies ScriptedLane;
	});

export const censusLane = (census: SessionCensus): SessionAudit => ({
	census: () => Effect.succeed(census),
	node: () => Effect.succeed([]),
});
