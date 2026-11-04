import { Context, type Schema } from "effect";
import type { AppDefinition } from "#app.ts";
export interface StampedEvent extends Record<string, unknown> {
	readonly _tag: string;
	readonly at: number;
	readonly sequence: number;
}
export class ExecutionDefinition extends Context.Service<
	ExecutionDefinition,
	{
		readonly definition: AppDefinition;
		readonly names: readonly string[];
		readonly events: Schema.Codec<StampedEvent, unknown>;
	}
>()("@antumbra/server-journal/ExecutionDefinition") {}
