import { Effect, Layer } from "effect";
import type { IntentDemandRegistration } from "#registration.ts";
import { Registrations } from "#registrations.ts";
import { IntentDemand } from "#service.ts";

export const intentDemandLayer = <R>(registrations: ReadonlyArray<IntentDemandRegistration<R>>) =>
	IntentDemand.layer.pipe(
		Layer.provide(
			Layer.effect(Registrations)(
				Effect.context<R>().pipe(Effect.map((context) => registrations.map(({ pass, tag }) => ({ pass: Effect.provide(pass, context), tag })))),
			),
		),
	);
