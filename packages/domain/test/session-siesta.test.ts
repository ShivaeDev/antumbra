import { Boards } from "@antumbra/boards";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { mailWords } from "@antumbra/prompts";
import { SessionFabric } from "@antumbra/session-fabric";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { fleetSnapshot } from "#sight-fleet.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, endTurn, makeScriptedBackend, rawOf, sessionFor } from "#test/harness.ts";
import { eventually, reportsNativeRef, untilTerminal } from "#test/session-recovery-fixture.ts";

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
	return Option.getOrThrow(yield* db.AgentSession.where({ id: HAND.sessionId }).first());
});

const deliversMail = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const demand = domain.intentDemands.find((registration) => registration.tag === "session/mail-delivery");
	return demand === undefined ? yield* Effect.die("no mail delivery demand is registered") : yield* demand.pass;
});

const priorityMail = (body: string, sourceRef: string) =>
	Effect.flatMap(Boards, (boards) =>
		boards.mail({
			authorAgentId: Option.none(),
			body,
			precedence: "priority",
			sourceRef,
			toAgentId: HAND.agentId,
		}),
	);

it.live("a turn ending rests the session and disturbs nothing else", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;

		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const fabric = yield* SessionFabric;
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
			const attached = yield* fabric.attached();
			expect(
				(yield* fleetSnapshot(["scripted"], new Set(), [], [], {
					attached,
					delegating: new Set(),
				})).agents[0]?.sessions[0]?.canInterrupt,
			).toBe(true);

			yield* endTurn(scripted, HAND.agentId);
			const stillAttached = yield* fabric.attached();
			expect(stillAttached.has(HAND.sessionId)).toBe(true);
			const summary = (yield* fleetSnapshot(["scripted"], new Set(), [], [], {
				attached: stillAttached,
				delegating: new Set(),
			})).agents[0]?.sessions[0];
			expect(summary?.canInterrupt).toBe(false);
			expect(summary?.canSend).toBe(true);
			expect(summary?.presence).toBe("idle");
			expect(yield* live.closed).toBe(false);

			expect(yield* db.Agent.where({ id: HAND.agentId }).first()).toEqual(agentBefore);
			expect(yield* db.Moorage.where({ agentId: HAND.agentId }).first()).toEqual(moorageBefore);
			expect(yield* sessionRow).toEqual({
				...sessionBefore,
				executionStatus: "idle",
			});
			expect(Option.getOrThrow(yield* db.Agent.where({ id: HAND.agentId }).first()).status).toBe("alive");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("boot settles a draining Session without recovering its provider thread", () =>
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
			yield* db.AgentSession.where({ id: HAND.sessionId }).update({
				executionStatus: "draining",
			});
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

it.live("mail that arrived while an agent slept wakes it on the next restart", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const backend = reportsNativeRef(scripted.backend, scripted, "native-siesta");
		yield* Effect.gen(function* () {
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
			yield* endTurn(scripted, HAND.agentId);
			yield* priorityMail("the eastern approach is closed", "test:mail-wakes");
			expect(yield* scripted.opened).toHaveLength(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend)));

		yield* Effect.gen(function* () {
			expect((yield* sessionRow).executionStatus).toBe("idle");
			yield* deliversMail;
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* scripted.opened).toHaveLength(2);
					const resumed = yield* sessionFor(scripted, HAND.agentId);
					expect(yield* resumed.sent).toEqual([mailWords({ count: 1, precedence: "priority" })]);
				}),
			);
		}).pipe(Effect.provide(domainKernelLayer(temporary, backend)));
	}),
);
