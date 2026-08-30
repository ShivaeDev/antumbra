import { Data } from "effect";

export class IntentDemandConfigurationInvalid extends Data.TaggedError("IntentDemandConfigurationInvalid")<{
	readonly detail: string;
}> {}

export class IntentDemandPassFailed extends Data.TaggedError("IntentDemandPassFailed")<{
	readonly detail: string;
	readonly tag: string;
}> {}
