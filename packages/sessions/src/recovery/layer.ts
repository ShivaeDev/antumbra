import { Layer } from "effect";
import { RecoveryOptions, type SessionRecoveryOptions } from "#recovery/options.ts";
import { SessionRecoveryRuntime } from "#recovery/service.ts";

export const sessionRecoveryLayer = (options: SessionRecoveryOptions) =>
	SessionRecoveryRuntime.layer.pipe(Layer.provide(Layer.succeed(RecoveryOptions)(options)));
