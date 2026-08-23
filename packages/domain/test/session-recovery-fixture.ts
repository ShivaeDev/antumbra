import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import {
	type AgentBackend,
	BackendFailure,
	type Runner,
} from "@antumbra/plugin-api";
import { expect } from "@effect/vitest";
import { Effect, Option, Ref, Schedule, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { rawOf, type ScriptedBackend } from "#test/harness.ts";

export const RECOVERY_INSTRUCTION =
	"Reconcile durable Antumbra truth and continue your assigned work.";
const TERMINAL: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
]);
export const payload: SpawnFields = {
	agentId: "agent-resume",
	backend: "scripted",
	charter: "continue the durable piece",
	pieceId: "piece-resume",
	role: "test hand",
	runner: "local",
	sessionId: "session-resume",
};

export const untilTerminal = <E, R>(
	changes: Stream.Stream<IntentStatus, E, R>,
) =>
	changes.pipe(
		Stream.takeUntil((status) => TERMINAL.has(status)),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

export const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))),
	);

export const refuseWhile = (
	backend: AgentBackend,
	denied: Ref.Ref<boolean>,
): AgentBackend => ({
	...backend,
	openSession: (options) =>
		Ref.get(denied).pipe(
			Effect.flatMap((isDenied) => {
				if (!isDenied) {
					return backend.openSession(options);
				}
				return Effect.fail(
					new BackendFailure({
						detail: "authentication is required",
						tag: "scripted",
					}),
				);
			}),
		),
});

export const reportsNativeRef = (
	backend: AgentBackend,
	scripted: ScriptedBackend,
	nativeRef: string,
): AgentBackend => ({
	...backend,
	openSession: (options) =>
		backend
			.openSession(options)
			.pipe(
				Effect.tap(() =>
					Option.isSome(options.resume)
						? emitOpened(scripted, options.sessionId, nativeRef)
						: Effect.void,
				),
			),
});

export const emitOpened = (
	scripted: ScriptedBackend,
	sessionId: string,
	nativeRef: string,
) =>
	Effect.gen(function* () {
		const session = yield* scripted.session(sessionId);
		if (session === undefined) {
			return yield* Effect.die("resumed session was not attached");
		}
		yield* session.emit({
			nativeRef,
			raw: rawOf("session/opened"),
			type: "session.opened",
		});
	});

export const durableRows = Effect.gen(function* () {
	const db = yield* Database;
	return {
		agents: yield* db.Agent.all(),
		berths: yield* db.Berth.all(),
		moorages: yield* db.Moorage.all(),
		pieces: yield* db.PieceAgent.all(),
		sessions: yield* db.AgentSession.all(),
	};
});

export const seedResumableAgent = (
	temporary: TemporaryPersistence,
	backend: AgentBackend,
	runner: Runner,
	session: ScriptedBackend,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const kernel = yield* Kernel;
		const domain = yield* AgentDomain;
		yield* writer.write(
			db.Piece.create({
				charter: "keep going",
				expectation: "durable progress",
				id: payload.pieceId ?? "",
				launchedAt: new Date(1),
				parkedAt: null,
				role: payload.role,
				title: "resume a session",
			}),
		);
		yield* domain.repos.register({
			defaultRef: "main",
			source: "/somewhere/session-resume",
		});
		const submission = yield* kernel.submit(domain.spawn, payload);
		expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
		const live = yield* session.session(payload.sessionId);
		expect(live).toBeDefined();
		if (live === undefined) {
			return yield* Effect.die("spawned session was not attached");
		}
		yield* live.emit({
			nativeRef: "native-durable",
			raw: rawOf("session/opened"),
			type: "session.opened",
		});
		yield* live.emit({
			raw: rawOf("assistant/message"),
			role: "agent",
			text: "persisted before restart",
			type: "message",
		});
		yield* eventually(
			Effect.gen(function* () {
				const events = yield* db.SessionEvent.where({
					sessionId: payload.sessionId,
				})
					.orderBy((event) => event.seq.asc())
					.all();
				expect(events.map((event) => event.seq)).toEqual([0, 1]);
				expect(
					Option.getOrThrow(
						yield* db.AgentSession.where({ id: payload.sessionId }).first(),
					).nativeRef,
				).toBe("native-durable");
			}),
		);
		return yield* durableRows;
	}).pipe(Effect.provide(domainKernelLayer(temporary, backend, {}, runner)));

export const waitingRecovery = Effect.gen(function* () {
	const db = yield* Database;
	const rows = yield* db.Intent.where({ tag: "agent/recover" }).all();
	expect(rows).toHaveLength(1);
	expect(rows[0]?.status).toBe("waiting");
	return Option.getOrThrow(Option.fromUndefinedOr(rows[0]));
});
