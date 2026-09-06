import type { AlreadyDone, FeatureShape, Fields, QueryDefinition, ReadRows, RejectedBy, RowKey, RowShape, RowValue, Values } from "@antumbra/feature";
import type { Effect, Schema } from "effect";

export type Projections<Features extends readonly FeatureShape[]> = Features[number]["rows"][number];

export interface Emissions<Value> {
	readonly seen: Effect.Effect<readonly Value[]>;
}

export type Commits<Features extends readonly FeatureShape[]> = {
	readonly [Feature in Features[number] as Feature["name"]]: {
		readonly [Command in Feature["commands"][number] as Command["name"]]: (
			input: Values<Command["input"]>,
		) => Effect.Effect<number, AlreadyDone | RejectedBy<Command["rejections"]>>;
	};
};

export type Reads<Features extends readonly FeatureShape[]> = {
	readonly [Row in Projections<Features> as Row["name"]]: ReadRows<RowValue<Row>, RowKey<Row>>;
};

export type Seeds<Features extends readonly FeatureShape[]> = {
	readonly [Row in Projections<Features> as Row["name"]]: (value: RowValue<Row>) => Effect.Effect<void>;
};

export interface Watching {
	readonly advance: (millis: number) => Effect.Effect<void>;
}

export interface TestApp<Features extends readonly FeatureShape[]> {
	readonly clock: Watching;
	readonly commit: Commits<Features>;
	readonly live: <Name extends string, Input extends Fields, Output extends Schema.Top, Watched extends readonly RowShape[]>(
		query: QueryDefinition<Name, Input, Output, Watched>,
		input: Values<Input>,
	) => Effect.Effect<Emissions<Output["Type"]>>;
	readonly rows: Reads<Features>;
	readonly seed: Seeds<Features>;
	readonly settle: () => Effect.Effect<void>;
}
