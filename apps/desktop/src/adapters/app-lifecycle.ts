import { AppLifecycleSource } from "@antumbra/contract";
import { AgentDomain, recordRestartIntent } from "@antumbra/domain";
import { Database } from "@antumbra/persistence";
import { Effect, Layer, Ref } from "effect";
import { app } from "electron";

export const AppLifecycleSourceLive = (restarting: Ref.Ref<boolean>) =>
	Layer.effect(AppLifecycleSource)(
		Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const record = recordRestartIntent.pipe(Effect.provideService(Database, db), Effect.provideService(AgentDomain, domain), Effect.orDie);
			return {
				restart: record.pipe(Effect.andThen(Ref.set(restarting, true)), Effect.andThen(Effect.sync(() => app.quit()))),
			};
		}),
	);
