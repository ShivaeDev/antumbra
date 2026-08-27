import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";

const genericIdentity = Effect.fn("invalidGeneric.identity")(
	<Value>(value: Value) => Effect.succeed(value),
);

defineService({
	id: "invalid/Generic",
	initialize: Effect.void,
	methods: () => ({ genericIdentity }),
	requires: [],
});
