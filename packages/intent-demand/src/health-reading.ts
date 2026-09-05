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
