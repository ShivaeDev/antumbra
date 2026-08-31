import { Effect, Ref } from "effect";

export const initializeLiveDelegations = Effect.fn("liveDelegations.initialize")(() =>
	Ref.make<ReadonlyMap<string, ReadonlySet<string>>>(new Map()),
)();
