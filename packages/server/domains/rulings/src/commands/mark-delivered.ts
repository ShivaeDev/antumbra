import { command } from "@antumbra/platform-feature/command.ts";
import { rejections } from "#commands/guard.ts";
import { rulingDelivered } from "#facts/ruling-delivered.ts";
import { ruling } from "#rows/ruling.ts";
export const markDelivered = command("markDelivered", {
	input: rulingDelivered.payload,
	reads: [ruling],
	emits: rulingDelivered,
	rejections: { ...rejections },
});
