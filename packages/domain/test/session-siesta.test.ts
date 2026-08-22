import { Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { fleetSnapshot } from "#sight-fleet.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	domainKernelLayer,
	makeScriptedBackend,
	rawOf,
	sessionFor,
} from "#test/harness.ts";
import {
	eventually,
	reportsNativeRef,
	untilTerminal,
} from "#test/session-recovery-fixture.ts";

const HAND: SpawnFields = {
	agentId: "agent-siesta",
	backend: "scripted",
	charter: "hold the same watch",
	role: "hand",
	runner: "local",
	sessionId: "session-siesta",
};

const sessionRow = Effect.gen(function* () {
	const db = yield* Database;
	return Option.getOrThrow(
		yield* db.AgentSession.where({ id: HAND.sessionId }).first(),
	);
});

// why: standing down is a declaration, and the only durable trace of it is the
// row saying the Session is no longer executing. Nothing else about the Agent
// moves — identity, Moorage and the provider reference are all exactly as they
// were, which is what makes the state reversible by a single message.
it.live("stand down records the declaration and disturbs nothing else", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;

		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const submission = yield* kernel.submit(domain.spawn, HAND);
			expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
			const live = yield* sessionFor(scripted, HAND.agentId);
			yield* live.emit({
				nativeRef: "native-siesta",
				raw: rawOf("session/opened"),
				type: "session.opened",
			});
			yield* eventually(
				Effect.gen(function* () {
					expect((yield* sessionRow).nativeRef).toBe("native-siesta");
				}),
			);
			const agentBefore = yield* db.Agent.where({ id: HAND.agentId }).first();
			const moorageBefore = yield* db.Moorage.where({
				agentId: HAND.agentId,
			}).first();
			const sessionBefore = yield* sessionRow;
			const attached = yield* domain.sessionsAttached;
			expect(
				(yield* fleetSnapshot(["scripted"], [], {
					attached,
					delegating: new Set(),
				})).agents[0]?.sessions[0]?.canInterrupt,
			).toBe(true);

			expect(yield* callTool(live, "stand_down", undefined)).toEqual({
				ok: true,
				text: "standing by",
			});
			yield* eventually(
				Effect.gen(function* () {
					expect((yield* sessionRow).executionStatus).toBe("idle");
				}),
			);
			// why: nothing to interrupt, and still everything to say to.
			const stillAttached = yield* domain.sessionsAttached;
			expect(stillAttached.has(HAND.sessionId)).toBe(true);
			const summary = (yield* fleetSnapshot(["scripted"], [], {
				attached: stillAttached,
				delegating: new Set(),
			})).agents[0]?.sessions[0];
			expect(summary?.canInterrupt).toBe(false);
			expect(summary?.canSend).toBe(true);
			expect(summary?.presence).toBe("idle");
			expect(yield* live.closed).toBe(false);

			expect(yield* db.Agent.where({ id: HAND.agentId }).first()).toEqual(
				agentBefore,
			);
			expect(
				yield* db.Moorage.where({ agentId: HAND.agentId }).first(),
			).toEqual(moorageBefore);
			expect(yield* sessionRow).toEqual({
				...sessionBefore,
				executionStatus: "idle",
			});
			expect(
				Option.getOrThrow(yield* db.Agent.where({ id: HAND.agentId }).first())
					.status,
			).toBe("alive");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live(
	"boot settles a draining Session without recovering its provider thread",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const domain = yield* AgentDomain;
				const kernel = yield* Kernel;
				const submission = yield* kernel.submit(domain.spawn, HAND);
				expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
			}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));

			yield* Effect.gen(function* () {
				const db = yield* Database;
				const writer = yield* Writer;
				yield* writer.write(
					db.AgentSession.where({ id: HAND.sessionId }).update({
						executionStatus: "draining",
					}),
				);
			}).pipe(Effect.provide(temporary.layer));

			yield* Effect.gen(function* () {
				yield* eventually(
					Effect.gen(function* () {
						expect((yield* sessionRow).executionStatus).toBe("idle");
					}),
				);
				expect(yield* scripted.opened).toHaveLength(1);
			}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
		}),
);

it.live("idle survives restart and addressed mail does not wake it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const backend = reportsNativeRef(
			scripted.backend,
			scripted,
			"native-siesta",
		);
		const before = yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const submission = yield* kernel.submit(domain.spawn, HAND);
			expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
			const live = yield* sessionFor(scripted, HAND.agentId);
			yield* live.emit({
				nativeRef: "native-siesta",
				raw: rawOf("session/opened"),
				type: "session.opened",
			});
			yield* eventually(
				Effect.gen(function* () {
					expect((yield* sessionRow).nativeRef).toBe("native-siesta");
				}),
			);
			yield* callTool(live, "stand_down", undefined);
			yield* eventually(
				Effect.gen(function* () {
					expect((yield* sessionRow).executionStatus).toBe("idle");
				}),
			);
			// why: mail is a persisted fact, and persisted facts do not wake an
			// Agent — only the admiral speaking to it does.
			yield* domain.boards.mail({
				authorAgentId: Option.none(),
				body: "wait for explicit selection",
				precedence: "priority",
				sourceRef: "test:mail-does-not-wake",
				toAgentId: HAND.agentId,
			});
			yield* Effect.sleep(100);
			expect(yield* scripted.opened).toHaveLength(1);
			return {
				agent: yield* db.Agent.where({ id: HAND.agentId }).first(),
				moorage: yield* db.Moorage.where({ agentId: HAND.agentId }).first(),
				session: yield* sessionRow,
			};
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend)));

		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* Effect.sleep(100);
			expect(yield* scripted.opened).toHaveLength(1);
			expect(yield* db.Agent.where({ id: HAND.agentId }).first()).toEqual(
				before.agent,
			);
			expect(
				yield* db.Moorage.where({ agentId: HAND.agentId }).first(),
			).toEqual(before.moorage);
			expect(yield* sessionRow).toEqual(before.session);
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend)));
	}),
);
