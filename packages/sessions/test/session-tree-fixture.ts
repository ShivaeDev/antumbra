import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type NewAgentSession } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import type { SessionAudit, SessionCensus } from "@antumbra/plugin-api";
import { SessionEventJournalLive } from "@antumbra/session-event-journal";
import { SessionFabricLive } from "@antumbra/session-fabric";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Layer, Ref } from "effect";
import { LiveDelegationsLive } from "#session-tree-live.ts";

// why: the tree's own machinery over a database and nothing else. These seams
// answer about rows that closed while nothing was listening, so a rehearsal of
// them starts from the rows rather than from a stream. The fabric stands here
// with no acquisition in it, which is the truthful shape for a rehearsal whose
// events never came through one.
export const treeLayer = (temporary: TemporaryPersistence) =>
	SessionEventJournalLive.pipe(
		Layer.provideMerge(
			Layer.mergeAll(
				temporary.layer,
				DomainFeedsLive,
				LiveDelegationsLive,
				SessionFabricLive,
			),
		),
	);

export interface SeededSession {
	readonly agentId: string;
	readonly completeness?: string;
	readonly id: string;
	readonly nativeRef?: string | null;
	readonly parentSessionId?: string | null;
	readonly rootSessionId: string;
	readonly status?: string;
}

export const seedAgent = (
	id: string,
	status = "alive",
	currentSessionId: string | null = null,
) =>
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

// why: an Agent holds its current Session by id, so the pointer is set after
// the row it points at exists — the same order the spawn writes them in.
export const pointAgent = (id: string, currentSessionId: string | null) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Agent.where({ id }).update({ currentSessionId });
	});

export const sessionRow = (id: string) =>
	Database.use((db) => db.AgentSession.where({ id }).first());

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

// why: a lane that answers with what a rehearsal says the provider kept, and
// counts the times it was asked — a row the projection must never audit is one
// the provider is never read for either.
export const scriptedLane = (findings: ReadonlyArray<AgentEvent>) =>
	Effect.gen(function* () {
		const reads = yield* Ref.make(0);
		const audit: SessionAudit = {
			census: () => Effect.succeed({ events: [], nodes: [] }),
			node: () =>
				Ref.update(reads, (count) => count + 1).pipe(Effect.as(findings)),
		};
		return { audit, readings: Ref.get(reads) } satisfies ScriptedLane;
	});

// why: a lane whose census is written by hand — the provider's listing of a
// tree's children and its word on what each of them is doing, so a rehearsal
// can hold the delegation seam to the listing and nothing else.
export const censusLane = (census: SessionCensus): SessionAudit => ({
	census: () => Effect.succeed(census),
	node: () => Effect.succeed([]),
});
