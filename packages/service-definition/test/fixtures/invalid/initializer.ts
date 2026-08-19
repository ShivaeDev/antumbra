import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";

defineService({
	id: "fixture/InvalidInitializer",
	requires: [],
	operations: Effect.succeed({ value: Effect.succeed("value") }),
});
