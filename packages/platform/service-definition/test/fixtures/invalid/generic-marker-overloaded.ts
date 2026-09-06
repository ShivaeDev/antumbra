import { defineService } from "@antumbra/service-definition/define-service.ts";
import { genericMethod } from "@antumbra/service-definition/generic-method.ts";
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
