import { defineService } from "@antumbra/service-definition";
import { Context, Effect } from "effect";

class Declared extends Context.Service<Declared, object>()(
	"invalid/Declared",
) {}
class Residual extends Context.Service<Residual, object>()(
	"invalid/Residual",
) {}

const operation = Effect.fn("invalidResidual.operation")(
	function* (): Effect.fn.Return<void, never, Declared | Residual> {
		yield* Declared;
		yield* Residual;
	},
);

defineService({
	id: "fixture/InvalidResidual",
	requires: [Declared],
	operations: { operation },
});
