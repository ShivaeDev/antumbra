import { command } from "@antumbra/platform-feature/command.ts";
import { capabilityObserved } from "#facts/capability-observed.ts";

export const observeCapability = command("observeCapability", {
	input: capabilityObserved.payload,
	reads: [],
	emits: capabilityObserved,
	rejections: {},
});
