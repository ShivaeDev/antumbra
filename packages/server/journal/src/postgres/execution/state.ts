import type { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import type { Effect, Schema } from "effect";
import type { SqlError } from "effect/sql/SqlError";
import type { Registry } from "#app.ts";
import type { StampedEvent } from "#postgres/execution/definition.ts";

export interface State {
	readonly rows: Record<string, unknown>;
	readonly registry: Registry;
	readonly schema: Schema.Codec<StampedEvent, unknown>;
	readonly store: Effect.Success<ReturnType<typeof makeEventStore<StampedEvent, SqlError>>>;
}
