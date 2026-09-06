import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";

defineService({
	id: "invalid/MethodValue",
	initialize: Effect.void,
	methods: () => ({ value: Effect.succeed("value") }),
	requires: [],
});
