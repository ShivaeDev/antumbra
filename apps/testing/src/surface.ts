import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import type { Fields, Values } from "@antumbra/platform-feature/fields.ts";
import type { QueryDefinition } from "@antumbra/platform-feature/query.ts";
import type { AlreadyDone, RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import type { RowShape } from "@antumbra/platform-feature/row.ts";
import type { Api } from "@antumbra/platform-rpc/client.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { Records } from "@antumbra/server-storage/records.ts";
import type { Effect, Schema } from "effect";

export interface Emissions<A> {
	readonly seen: Effect.Effect<readonly A[]>;
}
export interface TestKit<Features extends readonly FeatureShape[]> {
	readonly clock: { readonly advance: (millis: number) => Effect.Effect<void> };
	readonly rows: Records["Service"];
	readonly commit: {
		readonly [Feature in Features[number] as Feature["name"]]: {
			readonly [Command in Feature["commands"][number] as Command["name"]]: (
				input: Values<Command["input"]> & { readonly requestId?: Request },
			) => Effect.Effect<number, AlreadyDone | RejectedBy<Command["rejections"]>>;
		};
	};
	readonly live: <Name extends string, Input extends Fields, Output extends Schema.Top, Reads extends readonly RowShape[]>(
		query: QueryDefinition<Name, Input, Output, Reads>,
		input: Values<Input>,
	) => Effect.Effect<Emissions<Output["Type"]>>;
	readonly settle: () => Effect.Effect<void>;
}
export interface TestApp<Features extends readonly FeatureShape[]> extends TestKit<Features> {
	readonly api: Api<Features>;
}
