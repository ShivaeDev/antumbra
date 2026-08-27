import { defineService } from "@antumbra/service-definition";
import { Context, Effect } from "effect";

class Declared extends Context.Service<Declared, object>()(
	"invalid/Declared",
) {}
class Secret extends Context.Service<Secret, object>()("invalid/Secret") {}

defineService({
	id: "invalid/InitializerRequirement",
	initialize: Effect.gen(function* () {
		yield* Declared;
		yield* Secret;
		return {};
	}),
	methods: () => ({
		value: () => Effect.void,
	}),
	requires: [Declared],
});
