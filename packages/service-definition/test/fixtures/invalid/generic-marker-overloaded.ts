import { defineService, genericMethod } from "@antumbra/service-definition";
import { Effect } from "effect";

function overloaded(value: string): Effect.Effect<string>;
function overloaded(value: number): Effect.Effect<number>;
function overloaded(value: string | number) {
	return Effect.succeed(value);
}

defineService({
	id: "invalid/GenericMarkerOverloaded",
	initialize: Effect.void,
	methods: () => ({ overloaded: genericMethod(overloaded) }),
	requires: [],
});
