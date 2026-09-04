import { Data } from "effect";

export class FrontierBlocking extends Data.TaggedError("FrontierBlocking")<{
	readonly rulingIds: ReadonlyArray<string>;
}> {
	override get message(): string {
		return `a blocking question stands on the voyage's frontier (ruling ${this.rulingIds.join(", ruling ")}) — chartering waits until each is ruled`;
	}
}

export class EdgeReached extends Data.TaggedError("EdgeReached")<{
	readonly unlaunched: ReadonlyArray<string>;
}> {
	override get message(): string {
		return `${this.unlaunched.length} pieces on the voyage are unlaunched (${this.unlaunched.join(", ")}) — chartering waits until one launches, is parked or is abandoned`;
	}
}
