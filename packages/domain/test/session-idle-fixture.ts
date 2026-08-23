import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect } from "@effect/vitest";
import { Clock, Effect, Layer, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { SightSourceLive } from "#sight.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { rawOf, type ScriptedBackend, sessionFor } from "#test/harness.ts";
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

// why: a rehearsal that needs two moments cannot sit through the gap between
// them, so the act runs against a clock further on — which is the same fact as
// having waited, for everything that reads the time rather than sleeping on it.
export const laterBy = <A, E, R>(millis: number, act: Effect.Effect<A, E, R>) =>
	Effect.flatMap(aheadBy(millis), (clock) =>
		act.pipe(Effect.provideService(Clock.Clock, clock)),
	);

export const passedAt = (millis: number) =>
	Effect.flatMap(siestaPass, (pass) => laterBy(millis, pass));
