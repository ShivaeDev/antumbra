import { conflict, type EffectTRPCRuntime, forbidden, internalServerError, makeEffectTRPC, makeRequestServices } from "@shivaedev/effect-trpc";
import { initTRPC } from "@trpc/server";
import { Context, Effect, Layer } from "effect";
import type { AppInfoSource } from "#app-info.ts";
import type { AppLifecycleSource } from "#app-lifecycle.ts";
import type { HoldSource } from "#holds/source.ts";
import type { RulingFailure, RulingRefused, RulingSource } from "#rulings/source.ts";
import type { SettingsSource } from "#settings/readings.ts";
import type { SightFailure, SightSource } from "#sight.ts";
import type { ArtifactMarkdownFailure, VoyageSource } from "#voyages.ts";
import type { WindowRefused, WindowSource } from "#windows.ts";

interface RequestContext {
	readonly windowId: string;
}

export class RequestOrigin extends Context.Service<RequestOrigin, RequestContext>()("@antumbra/contract/RequestOrigin") {}

export type AppRuntime = EffectTRPCRuntime<
	AppInfoSource | AppLifecycleSource | HoldSource | RulingSource | SettingsSource | SightSource | VoyageSource | WindowSource,
	never
>;

export const trpc = initTRPC.context<RequestContext>().create({ allowOutsideOfServer: true });

const requestServices = makeRequestServices((context: RequestContext) => Layer.succeed(RequestOrigin, context));

export const makeProcedure = (runtime: AppRuntime) => makeEffectTRPC({ runtime }).procedure(trpc.procedure, requestServices);

export type AppProcedure = ReturnType<typeof makeProcedure>;

export const surface = <A, R>(effect: Effect.Effect<A, ArtifactMarkdownFailure | RulingFailure | RulingRefused | SightFailure | WindowRefused, R>) =>
	effect.pipe(
		Effect.catchTags({
			ArtifactMarkdownFailure: (failure) => internalServerError(failure.message),
			RulingFailure: (failure) => internalServerError(failure.message),
			RulingRefused: (failure) => conflict(failure.reason),
			SightFailure: (failure) => internalServerError(failure.message),
			WindowRefused: (failure) => forbidden(failure.reason),
		}),
	);
