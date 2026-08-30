import type { Fleet } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import type { AgentBackend, Runner, SessionInput } from "@antumbra/plugin-api";
import { SessionFabricLive } from "@antumbra/session-fabric";
import { SessionWakePatience } from "@antumbra/sessions";
import { expect } from "@effect/vitest";
import { Effect, Layer, Option, Ref } from "effect";
import { domainKernelLayer, sightSourceTestLayer } from "#test/domain-layers.ts";
import { makeScriptedBackend, makeScriptedRunner, type ScriptedBackend } from "#test/harness.ts";
import { emitOpened, payload, reportsNativeRef, seedResumableAgent } from "#test/session-recovery-fixture.ts";

export const NATIVE = "native-durable";

// why: the reconnect census is the one thing a resume does that a scripted
// backend cannot stand in for, and it only ever announces itself through the
// opening frame. Withholding that frame on demand is how a rehearsal reaches
// the shape production hit: a provider that answered the open and then went
// quiet about who it was.
export const confirmsWhen = (backend: AgentBackend, scripted: ScriptedBackend, allowed: Ref.Ref<boolean>): AgentBackend => ({
	...backend,
	openSession: (options) =>
		Ref.get(allowed).pipe(
			Effect.flatMap((isAllowed) => (isAllowed ? reportsNativeRef(backend, scripted, NATIVE).openSession(options) : backend.openSession(options))),
		),
});

// why: a provider that runs its model on a stream of input has nothing to open
// about until the stream carries something — it answers the open, then says who
// it resumed as only once the first message arrives. The scripted double could
// not hold that shape at all: it announced itself at open time, so every
// rehearsal met a provider more forthcoming than the real one, and the order a
// resume speaks in was never under test.
export const opensWhenSpokenTo = (backend: AgentBackend, scripted: ScriptedBackend): AgentBackend => ({
	...backend,
	openSession: (options) =>
		Effect.gen(function* () {
			const handle = yield* backend.openSession(options);
			const said = yield* Ref.make(false);
			const announce = Ref.modify(said, (already) => [already, true]).pipe(
				Effect.flatMap((already) => (already || Option.isNone(options.resume) ? Effect.void : emitOpened(scripted, options.sessionId, NATIVE))),
			);
			return {
				...handle,
				queue: (input: SessionInput) => handle.queue(input).pipe(Effect.andThen(announce)),
			};
		}),
});

export const wakeLayer = (temporary: TemporaryPersistence, backend: AgentBackend, runner: Runner, patienceMillis?: number) => {
	const base = sightSourceTestLayer.pipe(
		Layer.provideMerge(SessionFabricLive),
		Layer.provideMerge(domainKernelLayer(temporary, backend, {}, runner)),
	);
	return patienceMillis === undefined ? base : base.pipe(Layer.provide(Layer.succeed(SessionWakePatience)(patienceMillis)));
};

export const sessionRow = Effect.gen(function* () {
	const db = yield* Database;
	return Option.getOrThrow(yield* db.AgentSession.where({ id: payload.sessionId }).first());
});

export const wakes = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/wake" }).all();
});

export const onlyWake = Effect.gen(function* () {
	const rows = yield* wakes;
	expect(rows).toHaveLength(1);
	return Option.getOrThrow(Option.fromUndefinedOr(rows[0]));
});

export const wakeChips = (fleet: Fleet) =>
	fleet.agents
		.flatMap((agent) => agent.sessions)
		.filter((session) => session.id === payload.sessionId)
		.flatMap((session) => session.diag.intents)
		.filter((intent) => intent.kind === "agent/wake");

// why: a root the rows still call active is stranded, which is a different
// state from one that went to sleep while the application watched. Putting the
// row to idle first is how the rehearsal gets the second: an asleep root
// nothing is already reaching for.
export const asleep = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.AgentSession.where({ id: payload.sessionId }).update({
		executionStatus: "idle",
	});
});

export const sleepingRoot = (temporary: TemporaryPersistence) =>
	Effect.gen(function* () {
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* seedResumableAgent(temporary, scripted.backend, recorded.runner, scripted);
		yield* asleep.pipe(Effect.provide(temporary.layer));
		return { recorded, scripted };
	});
