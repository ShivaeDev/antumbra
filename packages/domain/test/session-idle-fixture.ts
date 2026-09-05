import { SETTINGS, SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect } from "@effect/vitest";
import { Clock, Effect, Fiber, Layer, Option, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { makeSightSessionEvents } from "#sight-session-events.ts";
import { domainKernelLayer, sightSourceTestLayer } from "#test/domain-layers.ts";
import { makeScriptedBackend, rawOf, type ScriptedBackend, type ScriptedSession, sessionFor } from "#test/harness.ts";
import { aheadBy } from "#test/session-clock.ts";
import { reportsNativeRef, untilTerminal } from "#test/session-recovery-fixture.ts";

export const HAND: SpawnFields = {
	agentId: "agent-idle",
	backend: "scripted",
	charter: "hold the same watch",
	role: "hand",
	runner: "local",
	sessionId: "session-idle",
};

export const DEFAULT_IDLE_SIESTA_AFTER_MILLIS = SETTINGS.idleSiestaMinutes.fallback * 60_000;

export const sessionRow = Effect.gen(function* () {
	const db = yield* Database;
	return Option.getOrThrow(yield* db.AgentSession.where({ id: HAND.sessionId }).first());
});

export const sightLayer = (temporary: Parameters<typeof domainKernelLayer>[0], scripted: ScriptedBackend) =>
	sightSourceTestLayer.pipe(Layer.provideMerge(domainKernelLayer(temporary, reportsNativeRef(scripted.backend, scripted, "native-idle"))));

export const idleBackend = makeScriptedBackend.pipe(
	Effect.map((scripted) => ({
		providers: { backends: new Map([[scripted.backend.tag, reportsNativeRef(scripted.backend, scripted, "native-idle")]]) },
		state: scripted,
	})),
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
		const sight = yield* makeSightSessionEvents;
		const opened = yield* sight.sessionEventFeed({ fromSeq: 0, sessionId: HAND.sessionId }).pipe(Stream.take(1), Stream.runCollect, Effect.forkChild);
		yield* live.emit({
			nativeRef: "native-idle",
			raw: rawOf("session/opened"),
			type: "session.opened",
		});
		yield* Fiber.join(opened);
		expect((yield* sessionRow).nativeRef).toBe("native-idle");
		return live;
	});

export const presenceOf = Effect.gen(function* () {
	const sight = yield* SightSource;
	const fleet = yield* sight.fleet;
	const session = fleet.agents.flatMap((agent) => agent.sessions).find((row) => row.id === HAND.sessionId);
	return Option.getOrThrow(Option.fromUndefinedOr(session));
});

const siestaPass = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const demand = domain.intentDemands.find((registration) => registration.tag === "session/siesta");
	return demand === undefined ? yield* Effect.die("no siesta demand is registered") : demand.pass;
});

export const laterBy = <A, E, R>(millis: number, act: Effect.Effect<A, E, R>) =>
	Effect.flatMap(aheadBy(millis), (clock) => act.pipe(Effect.provideService(Clock.Clock, clock)));

export const passedAt = (millis: number) => Effect.flatMap(siestaPass, (pass) => laterBy(millis, pass));

const CHILD = "native-child";

export const delegates = (live: ScriptedSession) =>
	live.emit({
		raw: rawOf("subsession/opened"),
		spawnedBy: "tool-1",
		subsessionRef: CHILD,
		type: "subsession.opened",
	});

export const finishes = (live: ScriptedSession) =>
	live.emit({
		outcome: "completed",
		raw: rawOf("subsession/ended"),
		subsessionRef: CHILD,
		type: "subsession.ended",
	});

export const restingAt = (canSleep: boolean) =>
	Effect.gen(function* () {
		const sight = yield* SightSource;
		yield* sight.fleetFeed.pipe(
			Stream.map((fleet) => fleet.agents.flatMap((agent) => agent.sessions).find((session) => session.id === HAND.sessionId)),
			Stream.filter((session) => session?.presence === "idle" && session.canSleep === canSleep),
			Stream.runHead,
		);
	});
