import { dirname, join } from "node:path";
import { defineIntent, type IntentExecution, type IntentKind, type Kernel, KernelLive } from "@antumbra/kernel";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import type { AgentBackend } from "@antumbra/plugin-api";
import { BackendCapacities, type BackendCapacityReading, type BackendCapacityService } from "@antumbra/provider-capacity";
import { type WakeFields, WakePayload } from "@antumbra/sessions";
import { SettingsSourceLive } from "@antumbra/settings";
import { NodeServices } from "@effect/platform-node";
import { type Context, Effect, Layer, Ref, Stream } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { BackendCapacityReleases } from "#backend-capacity-releases/service.ts";
import { AgentDomainLive } from "#domain.ts";
import { type SpawnFields, SpawnPayload } from "#spawn-fields.ts";
import { makeScriptedBackend, passiveRunner } from "#test/harness.ts";

export const SCRIPTED = "scripted";

interface CapacityState {
	readonly detail: string | null;
	readonly status: "available" | "blocked";
}

const readingOf = (state: CapacityState): BackendCapacityReading => ({
	backend: SCRIPTED,
	detail: state.detail,
	observedAt: null,
	reason: state.status === "blocked" ? "usage-limit" : null,
	resetsAt: null,
	status: state.status,
	utilization: null,
});

export const makeCapacities = Effect.gen(function* () {
	const state = yield* Ref.make<CapacityState>({
		detail: "scripted quota exhausted",
		status: "blocked",
	});
	const current = () => Ref.get(state).pipe(Effect.map(readingOf));
	const capacities: BackendCapacityService = {
		announce: () => Effect.void,
		clear: () =>
			Ref.set(state, {
				detail: null,
				status: "available",
			}),
		current: () => current(),
		snapshot: () => current().pipe(Effect.map((reading) => [reading])),
	};
	return { capacities, state };
});

type AgentDomainService = Parameters<typeof AgentDomain.of>[0];
export type KernelService = Parameters<typeof Kernel.of>[0];

export const spawnKind = (execute: (payload: SpawnFields) => Effect.Effect<void, unknown, IntentExecution>) =>
	defineIntent({ execute, payload: SpawnPayload, tag: "agent/spawn" });

export const wakeKind = (execute: (payload: WakeFields) => Effect.Effect<void, unknown, IntentExecution>) =>
	defineIntent({ execute, payload: WakePayload, tag: "agent/wake" });

export const spawnPayload = (name: string): SpawnFields => ({
	agentId: name,
	backend: SCRIPTED,
	charter: `charter ${name}`,
	role: "navigator",
	runner: "local",
	sessionId: `session-${name}`,
});

export const wakePayload = (name: string): WakeFields => ({ sessionId: name });

const makeReleaseDomain = (spawn: IntentKind<SpawnFields>, wake: IntentKind<WakeFields>) =>
	Effect.map(AgentDomain, (template) =>
		AgentDomain.of({
			...template,
			kinds: [spawn, wake],
			spawn,
			wake,
		}),
	);

export const templateDomainLayer = (temporary: TemporaryPersistence, backend: AgentBackend) =>
	AgentDomainLive(
		new Map([[backend.tag, backend]]),
		new Map([[passiveRunner.tag, passiveRunner]]),
		new Map(),
		join(dirname(temporary.database), "artifacts"),
		join(dirname(temporary.database), "session-inputs"),
	).pipe(Layer.provide(NodeServices.layer), Layer.provideMerge(SettingsSourceLive), Layer.provideMerge(temporary.layer));

export const withReleaseDomain = (
	temporary: TemporaryPersistence,
	capacities: BackendCapacityService,
	spawn: IntentKind<SpawnFields>,
	wake: IntentKind<WakeFields>,
	use: (domain: AgentDomainService) => Effect.Effect<void, unknown, Context.Service.Identifier<typeof BackendCapacities>>,
) =>
	Effect.gen(function* () {
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* makeReleaseDomain(spawn, wake);
			yield* use(domain).pipe(Effect.provideService(BackendCapacities, capacities));
		}).pipe(Effect.provide(templateDomainLayer(temporary, scripted.backend)));
	});

export const dependencies = (
	database: TemporaryPersistence["layer"],
	domain: AgentDomainService,
	spawn: IntentKind<SpawnFields>,
	wake: IntentKind<WakeFields>,
) => Layer.mergeAll(KernelLive({ kinds: [spawn, wake] }).pipe(Layer.provideMerge(database)), Layer.succeed(AgentDomain, domain));

export const withReleases = (
	database: TemporaryPersistence["layer"],
	domain: AgentDomainService,
	spawn: IntentKind<SpawnFields>,
	wake: IntentKind<WakeFields>,
) => BackendCapacityReleases.layer.pipe(Layer.provideMerge(dependencies(database, domain, spawn, wake)));

export const waitForChange = (kernel: KernelService, id: string, expected: string) =>
	kernel.changes(id).pipe(
		Stream.filter((status) => status === expected),
		Stream.take(1),
		Stream.runDrain,
	);
