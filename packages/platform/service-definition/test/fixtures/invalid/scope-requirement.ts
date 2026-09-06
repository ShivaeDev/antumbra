import { defineService, type ServiceRequirements } from "@antumbra/service-definition";
import { Effect, Scope } from "effect";

const requirements = [Scope.Scope] as const;
type Requirements<Success> = ServiceRequirements<typeof requirements, Success>;

defineService({
	id: "invalid/ScopeRequirement",
	initialize: Effect.void,
	methods: () => ({
		scoped: Effect.fn("invalidScope.scoped")(function* (): Requirements<void> {
			yield* Scope.Scope;
		}),
	}),
	requires: requirements,
});
