import type { Effect, Scope } from "effect";
import type { Reconciler } from "#reconcile.ts";

export interface Loop<R> {
	readonly name: string;
	readonly open: Effect.Effect<Reconciler, never, R | Scope.Scope>;
}
