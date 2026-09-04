import { AppLifecycleSource } from "@antumbra/contract";
import { AgentDomain, recordRestartIntent } from "@antumbra/domain";
import { Database } from "@antumbra/persistence";
import { Effect, Layer, type Ref } from "effect";
import { app } from "electron";
import { requestRestart } from "#adapters/graceful-shutdown.ts";

export const AppLifecycleSourceLive = (restarting: Ref.Ref<boolean>) =>
	Layer.effect(AppLifecycleSource)(
		Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const record = recordRestartIntent.pipe(Effect.provideService(Database, db), Effect.provideService(AgentDomain, domain), Effect.orDie);
			return { restart: requestRestart(restarting, record, () => app.quit()) };
		}),
	);
