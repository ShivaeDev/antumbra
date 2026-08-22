import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect } from "@effect/vitest";
import { Clock, Effect, Layer, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { SightSourceLive } from "#sight.ts";
import {
	domainKernelLayer,
	rawOf,
	type ScriptedBackend,
	sessionFor,
} from "#test/harness.ts";
import { aheadBy } from "#test/session-clock.ts";
import {
	eventually,
	reportsNativeRef,
	untilTerminal,
} from "#test/session-recovery-fixture.ts";

export const HAND: SpawnFields = {
	agentId: "agent-idle",
	backend: "scripted",
	charter: "hold the same watch",
	role: "hand",
	runner: "local",
	sessionId: "session-idle",
};

export const sessionRow = Effect.gen(function* () {
	const db = yield* Database;
	return Option.getOrThrow(
		yield* db.AgentSession.where({ id: HAND.sessionId }).first(),
	);
});

export const sightLayer = (
	temporary: Parameters<typeof domainKernelLayer>[0],
	scripted: ScriptedBackend,
) =>
	SightSourceLive.pipe(
		Layer.provideMerge(
			domainKernelLayer(
				temporary,
				reportsNativeRef(scripted.backend, scripted, "native-idle"),
			),
		),
	);

export const spawned = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const submission = yield* kernel.submit(domain.spawn, HAND);
	expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
});

export const openedNatively = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const live = yield* sessionFor(scripted, HAND.agentId);
		yield* live.emit({
			nativeRef: "native-idle",
			raw: rawOf("session/opened"),
			type: "session.opened",
		});
		yield* eventually(
			Effect.gen(function* () {
				expect((yield* sessionRow).nativeRef).toBe("native-idle");
			}),
		);
		return live;
	});

export const presenceOf = Effect.gen(function* () {
	const sight = yield* SightSource;
	const fleet = yield* sight.fleet;
	const session = fleet.agents
		.flatMap((agent) => agent.sessions)
		.find((row) => row.id === HAND.sessionId);
	return Option.getOrThrow(Option.fromUndefinedOr(session));
});

// why: the demand pass the app runs on its own timer, run by hand instead, so
// a rehearsal awaits the pass rather than waiting for one to come around.
const siestaPass = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const demand = domain.intentDemands.find(
		(registration) => registration.tag === "session/siesta",
	);
	return demand === undefined
		? yield* Effect.die("no siesta demand is registered")
		: demand.pass;
});

export const passedAt = (millis: number) =>
	Effect.gen(function* () {
		const pass = yield* siestaPass;
		const clock = yield* aheadBy(millis);
		yield* pass.pipe(Effect.provideService(Clock.Clock, clock));
	});
