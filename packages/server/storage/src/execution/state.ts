import type { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Context, type Effect, type Schema } from "effect";
import type { SqlError } from "effect/sql/SqlError";
import type { ExecutionDefinition, StampedEvent } from "#execution/definition.ts";

export interface State {
	readonly model: ExecutionDefinition["Service"];
	readonly schema: Schema.Codec<StampedEvent, unknown>;
	readonly store: Effect.Success<ReturnType<typeof makeEventStore<StampedEvent, SqlError>>>;
}

export class ExecutionStore extends Context.Service<ExecutionStore, State>()("@antumbra/server-storage/ExecutionStore") {}
