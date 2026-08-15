import {
	type EffectTRPCRuntime,
	internalServerError,
	makeEffectTRPC,
	makeRequestServices,
} from "@shivaedev/effect-trpc";
import { initTRPC } from "@trpc/server";
import { Context, Effect, Layer } from "effect";
import type { AppInfoSource } from "#app-info.ts";
import type { SightFailure, SightSource } from "#sight.ts";
import type { VoyageSource } from "#voyages.ts";

export interface RequestContext {
	readonly senderId: number;
}

export class RequestOrigin extends Context.Service<
	RequestOrigin,
	RequestContext
>()("@antumbra/contract/RequestOrigin") {}

export type AppRuntime = EffectTRPCRuntime<
	AppInfoSource | SightSource | VoyageSource,
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
export const surface = <A, R>(effect: Effect.Effect<A, SightFailure, R>) =>
	effect.pipe(
		Effect.catchTag("SightFailure", (failure) =>
			internalServerError(failure.message),
		),
	);
