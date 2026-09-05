import { Boards } from "@antumbra/boards";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { mailWords } from "@antumbra/prompts";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, completesTurn, endTurn, makeScriptedBackend, rawOf, type ScriptedBackend, sessionFor } from "#test/harness.ts";
import { eventually, refuseWhile, reportsNativeRef, untilTerminal, untilWaitingOrTerminal } from "#test/session-recovery-fixture.ts";

const HAND: SpawnFields = {
	agentId: "agent-post",
	backend: "scripted",
	charter: "hold the same watch",
	role: "hand",
	runner: "local",
	sessionId: "session-post",
};

const NATIVE = "native-post";

const wakeIntents = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/wake" }).all();
});

const deliversMail = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const demand = domain.intentDemands.find((registration) => registration.tag === "session/mail-delivery");
	return demand === undefined ? yield* Effect.die("no mail delivery demand is registered") : yield* demand.pass;
});

const mailed = (body: string, sourceRef: string) =>
	Effect.flatMap(Boards, (boards) =>
		boards.mail({
			authorAgentId: Option.none(),
			body,
			precedence: "priority",
			sourceRef,
			toAgentId: HAND.agentId,
		}),
	);

const working = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const submission = yield* kernel.submit(domain.spawn, HAND);
		expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
		const live = yield* sessionFor(scripted, HAND.agentId);
		yield* live.emit({ nativeRef: NATIVE, raw: rawOf("session/opened"), type: "session.opened" });
		yield* eventually(
			Effect.gen(function* () {
				const db = yield* Database;
				expect(Option.getOrThrow(yield* db.AgentSession.where({ id: HAND.sessionId }).first()).nativeRef).toBe(NATIVE);
			}),
		);
		return live;
	});

it.live("a turn ending with mail already waiting wakes the agent at once", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const live = yield* working(scripted);
			yield* mailed("the eastern approach is closed", "test:mail-at-the-boundary");
			yield* completesTurn(live);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* live.steered).toEqual([mailWords({ count: 1, precedence: "priority" })]);
				}),
			);
		}).pipe(Effect.provide(domainKernelLayer(temporary, reportsNativeRef(scripted.backend, scripted, NATIVE))));
	}),
);

it.live("mail adds no second wake while one is already pending", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const denied = yield* Ref.make(false);
		const refusing = refuseWhile(reportsNativeRef(scripted.backend, scripted, NATIVE), denied);
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			yield* working(scripted);
			yield* endTurn(scripted, HAND.agentId);
			const siesta = yield* kernel.submit(domain.siesta, { sessionId: HAND.sessionId });
			expect(yield* untilTerminal(siesta.changes)).toBe("succeeded");

			yield* Ref.set(denied, true);
			yield* mailed("the eastern approach is closed", "test:one-wake-only");
			yield* deliversMail;
			const submitted = yield* wakeIntents;
			expect(submitted).toHaveLength(1);
			expect(yield* untilWaitingOrTerminal(kernel.changes(submitted[0]?.id ?? ""))).toBe("waiting");

			yield* deliversMail;
			expect(yield* wakeIntents).toHaveLength(1);
		}).pipe(Effect.provide(domainKernelLayer(temporary, refusing)));
	}),
);
