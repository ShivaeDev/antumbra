import type { Fleet } from "@antumbra/contract";
import { Database, Writer } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import type { AgentBackend, Runner } from "@antumbra/plugin-api";
import { SessionFabricLive } from "@antumbra/session-fabric";
import { expect } from "@effect/vitest";
import { Effect, Layer, Option, Ref } from "effect";
import { SessionWakePatience } from "#session-wake-patience.ts";
import { SightSourceLive } from "#sight.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	makeScriptedBackend,
	makeScriptedRunner,
	type ScriptedBackend,
} from "#test/harness.ts";
import {
	payload,
	reportsNativeRef,
	seedResumableAgent,
} from "#test/session-recovery-fixture.ts";

export const NATIVE = "native-durable";

// why: the reconnect census is the one thing a resume does that a scripted
// backend cannot stand in for, and it only ever announces itself through the
// opening frame. Withholding that frame on demand is how a rehearsal reaches
// the shape production hit: a provider that answered the open and then went
// quiet about who it was.
export const confirmsWhen = (
	backend: AgentBackend,
	scripted: ScriptedBackend,
	allowed: Ref.Ref<boolean>,
): AgentBackend => ({
	...backend,
	openSession: (options) =>
		Ref.get(allowed).pipe(
			Effect.flatMap((isAllowed) =>
				isAllowed
					? reportsNativeRef(backend, scripted, NATIVE).openSession(options)
					: backend.openSession(options),
			),
		),
});

export const wakeLayer = (
	temporary: TemporaryPersistence,
	backend: AgentBackend,
	runner: Runner,
	patienceMillis?: number,
) => {
	const base = SightSourceLive.pipe(
		Layer.provideMerge(SessionFabricLive),
		Layer.provideMerge(domainKernelLayer(temporary, backend, {}, runner)),
	);
	return patienceMillis === undefined
		? base
		: base.pipe(
				Layer.provide(Layer.succeed(SessionWakePatience)(patienceMillis)),
			);
};

export const sessionRow = Effect.gen(function* () {
	const db = yield* Database;
	return Option.getOrThrow(
		yield* db.AgentSession.where({ id: payload.sessionId }).first(),
	);
});

export const recoveries = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/recover" }).all();
});

export const onlyRecovery = Effect.gen(function* () {
	const rows = yield* recoveries;
	expect(rows).toHaveLength(1);
	return Option.getOrThrow(Option.fromUndefinedOr(rows[0]));
});

export const wakeChips = (fleet: Fleet) =>
	fleet.agents
		.flatMap((agent) => agent.sessions)
		.filter((session) => session.id === payload.sessionId)
		.flatMap((session) => session.diag.intents)
		.filter((intent) => intent.kind === "agent/recover");

// why: boot recovery resumes a Session the rows still call active, which is a
// different act from the admiral speaking to one that went to sleep while the
// application watched. Putting the row to idle first is how the rehearsal gets
// the second: an asleep root nothing is already reaching for.
export const asleep = Effect.gen(function* () {
	const db = yield* Database;
	const writer = yield* Writer;
	yield* writer.write(
		db.AgentSession.where({ id: payload.sessionId }).update({
			executionStatus: "idle",
		}),
	);
});

export const sleepingRoot = (temporary: TemporaryPersistence) =>
	Effect.gen(function* () {
		const scripted = yield* makeScriptedBackend;
		const recorded = yield* makeScriptedRunner;
		yield* seedResumableAgent(
			temporary,
			scripted.backend,
			recorded.runner,
			scripted,
		);
		yield* asleep.pipe(Effect.provide(temporary.layer));
		return { recorded, scripted };
	});
