import { Effect, Layer } from "effect";
import { SessionSendOptions } from "#send/options.ts";
import { SessionSend } from "#send/service.ts";
import { SessionWakePatience } from "#wake/patience.ts";

export const sessionSendLayer = (imageInputBackends: ReadonlySet<string>) =>
	SessionSend.layer.pipe(
		Layer.provide(
			Layer.effect(SessionSendOptions)(Effect.map(SessionWakePatience, (wakePatienceMillis) => ({ imageInputBackends, wakePatienceMillis }))),
		),
	);
