import type { Reconciler } from "@shivaedev/reconciler/Reconciler.ts";
import type { Effect, Scope } from "effect";

export type Work = Pick<Reconciler<unknown>, "refresh" | "await">;

export interface Loop<R> {
	readonly name: string;
	readonly open: Effect.Effect<Work, never, R | Scope.Scope>;
}
