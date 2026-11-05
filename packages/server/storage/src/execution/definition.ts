import type { Event } from "@shivaedev/events/types.ts";
import { Context, type Effect, type Schema } from "effect";
import type { Records } from "#records.ts";
export interface StampedEvent extends Record<string, unknown> {
	readonly _tag: string;
	readonly at: number;
	readonly sequence: number;
}
export class ExecutionDefinition extends Context.Service<
	ExecutionDefinition,
	{
		readonly project: (event: Event<StampedEvent>) => Effect.Effect<void, never, Records>;
		readonly refresh: Effect.Effect<void, never, Records>;
		readonly names: readonly string[];
		readonly events: Schema.Codec<StampedEvent, unknown>;
	}
>()("@antumbra/server-storage/ExecutionDefinition") {}
