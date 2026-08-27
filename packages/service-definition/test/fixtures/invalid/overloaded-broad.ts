import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";

function overloaded(value: string): Effect.Effect<string>;
function overloaded(value: string | number): Effect.Effect<string>;
function overloaded(value: string | number) {
	return Effect.succeed(String(value));
}

defineService({
	id: "invalid/OverloadedBroad",
	initialize: Effect.void,
	methods: () => ({ overloaded }),
	requires: [],
});
