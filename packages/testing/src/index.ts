import { dirname, join } from "node:path";
import type { Boards } from "@antumbra/boards";
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
import { makeEffectApp, makeScriptedBackend, passiveRunner, rawOf, type ScriptedBackend } from "@antumbra/testing-runtime";
import type { Voyages } from "@antumbra/voyages";
import { NodeServices } from "@effect/platform-node";
import { type Context, Effect, Layer, Option, Schedule } from "effect";

interface AppHarness {
	readonly db: DatabaseService;
	readonly scripted: ScriptedBackend;
}

type AppRequirements =
	| AgentDomain
	| Kernel
	| Context.Service.Identifier<typeof Pieces>
	| Context.Service.Identifier<typeof Voyages>
	| Context.Service.Identifier<typeof Boards>;

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

export const endsTurn = (scripted: ScriptedBackend, sessionId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const session = yield* scripted.session(sessionId);
		if (session === undefined) {
			return yield* Effect.die(`the session was never opened: ${sessionId}`);
		}
		yield* session.emit({ durationMs: 1, raw: rawOf("turn/completed"), status: "completed", type: "turn.completed" });
		yield* Effect.gen(function* () {
			const row = yield* db.AgentSession.where({ id: sessionId }).first();
			if (Option.getOrThrow(row).executionStatus !== "idle") {
				return yield* Effect.fail("the session is still working");
			}
		}).pipe(Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))), Effect.orDie);
	});
