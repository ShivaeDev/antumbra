import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import type { Fields, Values } from "@antumbra/platform-feature/fields.ts";
import type { ReadRows } from "@antumbra/platform-feature/handles.ts";
import type { PortServices, PortShape } from "@antumbra/platform-feature/port.ts";
import type { QueryDefinition } from "@antumbra/platform-feature/query.ts";
import type { AlreadyDone, RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import type { RowKey, RowShape, RowValue } from "@antumbra/platform-feature/row.ts";
import type { Api } from "@antumbra/platform-rpc/client.ts";
import type * as Id from "@antumbra/platform-vocabulary/id.ts";
import type { Effect, Schema } from "effect";

export type Projections<Features extends readonly FeatureShape[]> = Features[number]["rows"][number];

export interface Emissions<Value> {
	readonly seen: Effect.Effect<readonly Value[]>;
}

export type Commits<Features extends readonly FeatureShape[]> = {
	readonly [Feature in Features[number] as Feature["name"]]: {
		readonly [Command in Feature["commands"][number] as Command["name"]]: (
			input: Values<Command["input"]> & { readonly requestId?: Id.Request },
		) => Effect.Effect<number, AlreadyDone | RejectedBy<Command["rejections"]>>;
	};
};

export type Reads<Features extends readonly FeatureShape[]> = {
	readonly [Row in Projections<Features> as Row["name"]]: ReadRows<RowValue<Row>, RowKey<Row>>;
};

export interface Watching {
	readonly advance: (millis: number) => Effect.Effect<void>;
}

export interface TestKit<Features extends readonly FeatureShape[]> {
	readonly clock: Watching;
	readonly commit: Commits<Features>;
	readonly live: <
		Name extends string,
		Input extends Fields,
		Output extends Schema.Top,
		Watched extends readonly RowShape[],
		Ports extends readonly PortShape[],
	>(
		query: QueryDefinition<Name, Input, Output, Watched, Ports>,
		input: Values<Input>,
	) => Effect.Effect<Emissions<Output["Type"]>, never, PortServices<Ports>>;
	readonly rows: Reads<Features>;
	readonly settle: () => Effect.Effect<void>;
}

export interface TestApp<Features extends readonly FeatureShape[]> extends TestKit<Features> {
	readonly api: Api<Features>;
}
