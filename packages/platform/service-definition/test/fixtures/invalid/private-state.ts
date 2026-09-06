import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";

const PrivateState = defineService({
	id: "invalid/PrivateState",
	initialize: Effect.succeed({ secret: "secret" }),
	methods: (state) => ({
		value: () => Effect.succeed(state.secret),
	}),
	requires: [],
});

Effect.gen(function* () {
	const service = yield* PrivateState;
	return service.secret;
});
