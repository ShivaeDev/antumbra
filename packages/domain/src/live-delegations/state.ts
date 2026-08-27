import type { Ref } from "effect";

export type LiveDelegationState = Ref.Ref<
	ReadonlyMap<string, ReadonlySet<string>>
>;
