import { defineService, genericMethod } from "@antumbra/service-definition";
import { Context, Effect } from "effect";

class Declared extends Context.Service<Declared, { readonly value: string }>()(
	"invalid/Declared",
) {}

const generic = Effect.fn("invalidGeneric.preserve")(
	<Success, Failure, Requirements>(
		effect: Effect.Effect<Success, Failure, Requirements>,
	): Effect.Effect<Success, Failure, Requirements | Declared> =>
		Declared.pipe(Effect.andThen(effect)),
);

defineService({
	id: "invalid/GenericDeclaredRequirement",
	initialize: Effect.void,
	methods: () => ({ generic: genericMethod(generic) }),
	requires: [Declared],
});
