import { dirname, join } from "node:path";
import {
	AgentDomain,
	AgentDomainLive,
	BackendCapacityReleases,
	ChangeWatcher,
	DispatcherLive,
	FlagshipLive,
	IntentFeedLive,
	KernelReachLive,
	RulingAscent,
	RulingDeliveryLive,
	RulingSourceLive,
	SessionShutdownLive,
	SettingsSourceLive,
	SightSourceLive,
	VoyageSourceLive,
} from "@antumbra/domain";
import { IntentDemandLive } from "@antumbra/intent-demand";
import { type Kernel, KernelLive } from "@antumbra/kernel";
import { Database, type DatabaseService } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import type { Pieces } from "@antumbra/pieces";
import { makeEffectApp, makeScriptedBackend, passiveRunner, type ScriptedBackend } from "@antumbra/testing-runtime";
import type { Voyages } from "@antumbra/voyages";
import { NodeServices } from "@effect/platform-node";
import { type Context, Effect, Layer } from "effect";

interface AppHarness {
	readonly db: DatabaseService;
	readonly scripted: ScriptedBackend;
}

type AppRequirements = AgentDomain | Kernel | Context.Service.Identifier<typeof Pieces> | Context.Service.Identifier<typeof Voyages>;

const applicationLayer = (temporary: TemporaryPersistence, scripted: ScriptedBackend) => {
	const directory = dirname(temporary.database);
	const agents = AgentDomainLive(
		new Map([[scripted.backend.tag, scripted.backend]]),
		new Map([[passiveRunner.tag, passiveRunner]]),
		new Map(),
		join(directory, "artifacts"),
		join(directory, "session-inputs"),
	).pipe(Layer.provide(NodeServices.layer));
	const kernel = Layer.unwrap(
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			return KernelLive({ kinds: domain.kinds });
		}),
	).pipe(Layer.provideMerge(agents));
	return Layer.mergeAll(
		RulingSourceLive,
		SightSourceLive,
		VoyageSourceLive,
		ChangeWatcher(),
		DispatcherLive(),
		Layer.unwrap(
			Effect.gen(function* () {
				const domain = yield* AgentDomain;
				return IntentDemandLive(domain.intentDemands);
			}),
		),
		FlagshipLive,
		IntentFeedLive,
		KernelReachLive,
		RulingAscent,
		RulingDeliveryLive,
		SessionShutdownLive,
	).pipe(Layer.provideMerge(BackendCapacityReleases.layer), Layer.provideMerge(kernel), Layer.provideMerge(SettingsSourceLive), Layer.orDie);
};

const makeApp = (temporary: TemporaryPersistence) =>
	Effect.gen(function* () {
		const scripted = yield* makeScriptedBackend;
		const harness = Effect.gen(function* () {
			return { db: yield* Database, scripted };
		});
		return { harness, layer: applicationLayer(temporary, scripted) };
	});

export const it = { effectApp: makeEffectApp<AppHarness, AppRequirements>(makeApp) };
