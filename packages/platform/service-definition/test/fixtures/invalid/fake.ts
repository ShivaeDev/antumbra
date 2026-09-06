import { defineService } from "@antumbra/service-definition";
import { Effect, Layer } from "effect";

const Fakeable = defineService({
	id: "invalid/Fakeable",
	initialize: Effect.void,
	methods: () => ({
		first: () => Effect.succeed("first"),
		second: () => Effect.succeed("second"),
	}),
	requires: [],
});

Layer.succeed(Fakeable)({ first: () => Effect.succeed("first") });
