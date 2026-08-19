import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";

const genericIdentity = Effect.fn("invalidGeneric.genericIdentity")(function* <
	Value,
>(value: Value): Effect.fn.Return<Value> {
	return yield* Effect.succeed(value);
});

defineService({
	id: "fixture/InvalidGeneric",
	requires: [],
	operations: { genericIdentity },
});
