import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import {
	type AgentBackend,
	BackendFailure,
	type Runner,
} from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref, Schedule, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	makeScriptedRunner,
	rawOf,
	type ScriptedBackend,
} from "#test/harness.ts";

const RECOVERY_INSTRUCTION =
	"Reconcile durable Antumbra truth and continue your assigned work.";
const TERMINAL: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
]);
const payload: SpawnFields = {
	agentId: "agent-resume",
	backend: "scripted",
	charter: "continue the durable piece",
	pieceId: "piece-resume",
	role: "test hand",
	runner: "local",
	sessionId: "session-resume",
};

const untilTerminal = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(
		Stream.takeUntil((status) => TERMINAL.has(status)),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))),
	);

const refuseWhile = (
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

const durableRows = Effect.gen(function* () {
	const db = yield* Database;
	return {
		agents: yield* db.Agent.all(),
		berths: yield* db.Berth.all(),
		moorages: yield* db.Moorage.all(),
		pieces: yield* db.PieceAgent.all(),
		sessions: yield* db.AgentSession.all(),
	};
});

const seedResumableAgent = (
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

const waitingRecovery = Effect.gen(function* () {
	const db = yield* Database;
	const rows = yield* db.Intent.where({ tag: "agent/recover" }).all();
	expect(rows).toHaveLength(1);
	expect(rows[0]?.status).toBe("waiting");
	return Option.getOrThrow(Option.fromUndefinedOr(rows[0]));
});

it.live(
	"rebuild resumes the same native session and durable event sequence",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const recorded = yield* makeScriptedRunner;
			const backend = scripted.backend;
			const before = yield* seedResumableAgent(
				temporary,
				backend,
				recorded.runner,
				scripted,
			);

			yield* Effect.gen(function* () {
				const db = yield* Database;
				const resumed = yield* eventually(
					Effect.gen(function* () {
						const live = yield* scripted.session(payload.sessionId);
						expect(yield* scripted.opened).toHaveLength(2);
						expect(live).toBeDefined();
						return Option.getOrThrow(Option.fromUndefinedOr(live));
					}),
				);
				const secondOpen = (yield* scripted.opened)[1];
				expect(secondOpen?.resume).toEqual(Option.some("native-durable"));
				expect(secondOpen?.sessionId).toBe(payload.sessionId);
				expect(secondOpen?.tools.map((tool) => tool.name)).toContain(
					"land_report",
				);
				expect(yield* resumed.sent).toEqual([RECOVERY_INSTRUCTION]);
				expect(yield* durableRows).toEqual(before);

				yield* resumed.emit({
					raw: rawOf("assistant/resumed"),
					role: "agent",
					text: "continued after restart",
					type: "message",
				});
				yield* eventually(
					Effect.gen(function* () {
						const events = yield* db.SessionEvent.where({
							sessionId: payload.sessionId,
						})
							.orderBy((event) => event.seq.asc())
							.all();
						expect(events.map((event) => event.seq)).toEqual([0, 1, 2]);
					}),
				);
			}).pipe(
				Effect.provide(
					domainKernelLayer(temporary, backend, {}, recorded.runner),
				),
			);
		}),
);

it.live("provider refusal waits without rewriting durable identity", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		const before = yield* seedResumableAgent(
			temporary,
			scripted.backend,
			recorded.runner,
			scripted,
		);
		const denied = yield* Ref.make(true);
		const refusing = refuseWhile(scripted.backend, denied);

		const recoveryId = yield* Effect.gen(function* () {
			const held = yield* eventually(waitingRecovery);
			expect(held.detail).toContain("authentication is required");
			expect(yield* durableRows).toEqual(before);
			return held.id;
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, refusing, {}, recorded.runner),
			),
		);
		yield* Ref.set(denied, false);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const held = yield* db.Intent.where({ tag: "agent/recover" }).all();
			expect(held.map((intent) => intent.id)).toEqual([recoveryId]);
			expect(held[0]?.status).toBe("waiting");
			yield* kernel.retry(recoveryId);
			expect(yield* untilTerminal(kernel.changes(recoveryId))).toBe(
				"succeeded",
			);
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed).toBeDefined();
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([
				RECOVERY_INSTRUCTION,
			]);
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, refusing, {}, recorded.runner),
			),
		);
	}),
);

it.live(
	"ambiguous durable authority waits without choosing an assignment",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const recorded = yield* makeScriptedRunner;
			yield* seedResumableAgent(
				temporary,
				scripted.backend,
				recorded.runner,
				scripted,
			);
			const before = yield* Effect.gen(function* () {
				const db = yield* Database;
				const writer = yield* Writer;
				yield* writer.write(
					db.PieceAgent.create({
						agentId: payload.agentId,
						pieceId: "piece-other",
					}),
				);
				return yield* durableRows;
			}).pipe(Effect.provide(temporary.layer));
			yield* Effect.gen(function* () {
				const held = yield* eventually(waitingRecovery);
				expect(held.detail).toContain("ambiguous current Piece authority");
				expect(yield* durableRows).toEqual(before);
			}).pipe(
				Effect.provide(
					domainKernelLayer(temporary, scripted.backend, {}, recorded.runner),
				),
			);
		}),
);
