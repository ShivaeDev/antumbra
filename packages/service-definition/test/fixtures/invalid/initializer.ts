import { defineService } from "@antumbra/service-definition";
import { Context, Effect } from "effect";

class Declared extends Context.Service<Declared, object>()(
	"invalid/Declared",
) {}
class Secret extends Context.Service<Secret, object>()("invalid/Secret") {}

defineService({
	id: "fixture/InvalidInitializer",
	requires: [Declared],
	operations: Effect.gen(function* () {
		yield* Secret;
		return { workflow: Effect.void };
	}),
});
