import { command } from "@antumbra/platform-feature/command.ts";
import { Effect } from "effect";
import { capacityObserved } from "#facts/observed.ts";

export const observe = command("observe", {
	input: capacityObserved.payload,
	reads: [],
	emits: capacityObserved,
	rejections: {},
	run: (input) => Effect.succeed(input),
});
