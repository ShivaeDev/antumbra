import {
	conflict,
	type EffectTRPCRuntime,
	forbidden,
	internalServerError,
	makeEffectTRPC,
	makeRequestServices,
} from "@shivaedev/effect-trpc";
import { initTRPC } from "@trpc/server";
import { Context, Effect, Layer } from "effect";
import type { AppInfoSource } from "#app-info.ts";
import type { RulingFailure, RulingRefused, RulingSource } from "#rulings.ts";
import type { SettingsSource } from "#settings/readings.ts";
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
	| AppInfoSource
	| RulingSource
	| SettingsSource
	| SightSource
	| VoyageSource
	| WindowSource,
	never
>;

// why: tRPC's own guess at "am I on a server" refuses to build a router in a
// browser, and the browser harness builds this one on purpose — it stands the
// window up against fixture sources with no host process behind it. What that
// guess protects is already held structurally: the boundary policy is what
// keeps this router out of the renderer's own graph.
export const trpc = initTRPC
	.context<RequestContext>()
	.create({ allowOutsideOfServer: true });

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
		| ArtifactMarkdownFailure
		| RulingFailure
		| RulingRefused
		| SightFailure
		| WindowRefused,
		R
	>,
) =>
	effect.pipe(
		Effect.catchTags({
			ArtifactMarkdownFailure: (failure) =>
				internalServerError(failure.message),
			RulingFailure: (failure) => internalServerError(failure.message),
			// why: a ruling already answered or never asked is a request the
			// record has outrun, not a window without the right to make it.
			RulingRefused: (failure) => conflict(failure.reason),
			SightFailure: (failure) => internalServerError(failure.message),
			WindowRefused: (failure) => forbidden(failure.reason),
		}),
	);
