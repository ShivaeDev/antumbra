import {
	type EffectTRPCRuntime,
	forbidden,
	internalServerError,
	makeEffectTRPC,
	makeRequestServices,
} from "@shivaedev/effect-trpc";
import { initTRPC } from "@trpc/server";
import { Context, Effect, Layer } from "effect";
import type { AppInfoSource } from "#app-info.ts";
import type { SightFailure, SightSource } from "#sight.ts";
import type { ArtifactMarkdownFailure, VoyageSource } from "#voyages.ts";
import type { WindowRefused, WindowSource } from "#windows.ts";

// why: main knows its windows by the record it owns for each one, so a request
// carries which window asked rather than which page says it is.
export interface RequestContext {
	readonly windowId: string;
}

export class RequestOrigin extends Context.Service<
	RequestOrigin,
	RequestContext
>()("@antumbra/contract/RequestOrigin") {}

export type AppRuntime = EffectTRPCRuntime<
	AppInfoSource | SightSource | VoyageSource | WindowSource,
	never
>;

export const trpc = initTRPC.context<RequestContext>().create();

const requestServices = makeRequestServices((context: RequestContext) =>
	Layer.succeed(RequestOrigin, context),
);

export const makeProcedure = (runtime: AppRuntime) =>
	makeEffectTRPC({ runtime }).procedure(trpc.procedure, requestServices);

export type AppProcedure = ReturnType<typeof makeProcedure>;

// why: every source states its refusals as one failure, and tRPC wants an
// error rather than a typed channel — this is the single crossing.
export const surface = <A, R>(
	effect: Effect.Effect<
		A,
		ArtifactMarkdownFailure | SightFailure | WindowRefused,
		R
	>,
) =>
	effect.pipe(
		Effect.catchTags({
			ArtifactMarkdownFailure: (failure) =>
				internalServerError(failure.message),
			SightFailure: (failure) => internalServerError(failure.message),
			WindowRefused: (failure) => forbidden(failure.reason),
		}),
	);
