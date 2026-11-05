import type { Reconciler, State } from "@shivaedev/reconciler/Reconciler.ts";
import type { Effect, Scope, Stream } from "effect";

export type Work = Pick<Reconciler<unknown>, "refresh" | "await"> & { readonly status?: Stream.Stream<State<unknown>> };

export interface Loop<R> {
	readonly name: string;
	readonly open: Effect.Effect<Work, never, R | Scope.Scope>;
}
