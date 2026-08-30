import { Data } from "effect";

export class IntentDemandPassFailed extends Data.TaggedError("IntentDemandPassFailed")<{
	readonly detail: string;
	readonly tag: string;
}> {}
