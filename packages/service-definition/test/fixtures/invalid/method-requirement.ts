import { defineService } from "@antumbra/service-definition";
import { Context, Effect } from "effect";

class Declared extends Context.Service<Declared, object>()(
	"invalid/Declared",
) {}
class Secret extends Context.Service<Secret, object>()("invalid/Secret") {}

defineService({
	id: "invalid/MethodRequirement",
	initialize: Effect.void,
	methods: () => ({
		value: Effect.fn("invalidMethod.value")(function* () {
			yield* Declared;
			yield* Secret;
		}),
	}),
	requires: [Declared],
});
