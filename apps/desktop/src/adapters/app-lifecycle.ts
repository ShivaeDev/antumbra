import { AppLifecycleSource } from "@antumbra/contract";
import { SessionRestart } from "@antumbra/domain";
import { Effect, Layer, type Ref } from "effect";
import { app } from "electron";
import { requestRestart } from "#adapters/graceful-shutdown.ts";

export const AppLifecycleSourceLive = (restarting: Ref.Ref<boolean>) =>
	Layer.effect(AppLifecycleSource)(
		Effect.gen(function* () {
			const restart = yield* SessionRestart;
			const record = restart.record().pipe(Effect.orDie);
			return { restart: requestRestart(restarting, record, () => app.quit()) };
		}),
	);
