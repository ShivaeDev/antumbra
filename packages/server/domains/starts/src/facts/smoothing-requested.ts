import { fact } from "@antumbra/platform-feature/fact.ts";
import { startRequested } from "#facts/start-requested.ts";
import { start } from "#rows/start.ts";

const { wakeSessionId: _wake, ...fields } = startRequested.payload;
export const smoothingRequested = fact("SmoothingRequested", {
	...fields,
	createsAgent: start.fields.createsAgent,
	constrainedPrompt: start.fields.constrainedPrompt,
	cwd: start.fields.cwd,
});
