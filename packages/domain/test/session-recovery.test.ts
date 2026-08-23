import { Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import {
	allowTestSessionOpenedWrites,
	rejectTestSessionOpenedWrites,
} from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref } from "effect";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	makeScriptedRunner,
	rawOf,
} from "#test/harness.ts";
import {
	durableRows,
	eventually,
	payload,
	RECOVERY_INSTRUCTION,
	refuseWhile,
	reportsNativeRef,
	seedResumableAgent,
	untilTerminal,
	waitingRecovery,
} from "#test/session-recovery-fixture.ts";

it.live(
	"rebuild resumes the same native session and durable event sequence",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const recorded = yield* makeScriptedRunner;
			const backend = reportsNativeRef(
				scripted.backend,
				scripted,
				"native-durable",
			);
			const before = yield* seedResumableAgent(
				temporary,
				scripted.backend,
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
						const attached = Option.getOrThrow(Option.fromUndefinedOr(live));
						expect(yield* attached.sent).toEqual([RECOVERY_INSTRUCTION]);
						return attached;
					}),
				);
				const secondOpen = (yield* scripted.opened)[1];
				expect(secondOpen?.resume).toEqual(Option.some("native-durable"));
				expect(secondOpen?.sessionId).toBe(payload.sessionId);
				expect(secondOpen?.tools.map((tool) => tool.name)).toContain(
					"land_report",
				);
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
		const refusing = refuseWhile(
			reportsNativeRef(scripted.backend, scripted, "native-durable"),
			denied,
		);

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
	"a provider fork on resume waits without replacing the durable native identity",
	() =>
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
			const forked = reportsNativeRef(
				scripted.backend,
				scripted,
				"native-other",
			);

			yield* Effect.gen(function* () {
				const db = yield* Database;
				const held = yield* eventually(waitingRecovery);
				expect(held.detail).toContain("native-durable");
				expect(held.detail).toContain("native-other");
				expect(yield* durableRows).toEqual(before);
				const session = Option.getOrThrow(
					yield* db.AgentSession.where({ id: payload.sessionId }).first(),
				);
				expect(session.nativeRef).toBe("native-durable");
				const resumed = yield* scripted.session(payload.sessionId);
				expect(resumed).toBeDefined();
				expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([]);
			}).pipe(
				Effect.provide(
					domainKernelLayer(temporary, forked, {}, recorded.runner),
				),
			);
		}),
);

it.live("a failed durable opening append waits before sending recovery", () =>
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
		yield* Effect.sync(() => rejectTestSessionOpenedWrites(temporary.database));
		const backend = reportsNativeRef(
			scripted.backend,
			scripted,
			"native-durable",
		);

		yield* Effect.gen(function* () {
			const db = yield* Database;
			const kernel = yield* Kernel;
			const held = yield* eventually(waitingRecovery);
			expect(held.detail).toContain("durably record native identity");
			expect(yield* durableRows).toEqual(before);
			const events = yield* db.SessionEvent.where({
				sessionId: payload.sessionId,
			})
				.orderBy((event) => event.seq.asc())
				.all();
			expect(events.map((event) => event.seq)).toEqual([0, 1]);
			const resumed = yield* scripted.session(payload.sessionId);
			expect(resumed).toBeDefined();
			expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([]);

			yield* Effect.sync(() =>
				allowTestSessionOpenedWrites(temporary.database),
			);
			yield* kernel.retry(held.id);
			yield* eventually(
				Effect.gen(function* () {
					const retried = yield* db.Intent.where({ id: held.id }).first();
					expect(Option.getOrThrow(retried).status).toBe("succeeded");
					expect(yield* scripted.opened).toHaveLength(3);
					const attached = yield* scripted.session(payload.sessionId);
					expect(attached).toBeDefined();
					expect(attached === undefined ? [] : yield* attached.sent).toEqual([
						RECOVERY_INSTRUCTION,
					]);
				}),
			);
			const settledEvents = yield* db.SessionEvent.where({
				sessionId: payload.sessionId,
			})
				.orderBy((event) => event.seq.asc())
				.all();
			expect(settledEvents.map((event) => event.seq)).toEqual([0, 1, 2]);
		}).pipe(
			Effect.provide(
				domainKernelLayer(temporary, backend, {}, recorded.runner),
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
