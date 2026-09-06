import { defineService } from "@antumbra/service-definition/define-service.ts";
import { genericMethod } from "@antumbra/service-definition/generic-method.ts";
import { Context, Effect } from "effect";

class Secret extends Context.Service<Secret, object>()("invalid/Secret") {}

const preserve = Effect.fn("invalidRequirementFree.preserve")(<Value>(value: Value) => Effect.succeed(value));

defineService({
	id: "invalid/RequirementFreeOrdinaryRequirement",
	initialize: Effect.void,
	methods: () => ({
		preserve: genericMethod(preserve),
		value: Effect.fn("invalidRequirementFree.value")(function* () {
			yield* Secret;
		}),
	}),
	requires: [],
});
