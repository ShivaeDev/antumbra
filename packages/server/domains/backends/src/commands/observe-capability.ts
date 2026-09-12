import { command } from "@antumbra/platform-feature/command.ts";
import { Effect } from "effect";
import { capabilityObserved } from "#facts/capability-observed.ts";

export const observeCapability = command("observeCapability", {
	input: capabilityObserved.payload,
	reads: [],
	emits: capabilityObserved,
	rejections: {},
	run: (input) => Effect.succeed({ backend: input.backend, imageInput: input.imageInput }),
});
