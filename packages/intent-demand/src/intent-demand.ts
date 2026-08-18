import { Context, type Effect } from "effect";
import type { IntentDemandPassFailed } from "#errors.ts";

export type IntentDemandHealth =
	| {
			readonly checkedAtMillis: number;
			readonly state: "healthy";
	  }
	| {
			readonly failedAtMillis: number;
			readonly failure: IntentDemandPassFailed;
			readonly state: "degraded";
	  };

export class IntentDemand extends Context.Service<
	IntentDemand,
	{
		readonly health: Effect.Effect<ReadonlyMap<string, IntentDemandHealth>>;
		readonly request: Effect.Effect<void>;
	}
>()("@antumbra/intent-demand/IntentDemand") {}
