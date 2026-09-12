import { fact } from "@antumbra/platform-feature/fact.ts";
import { birth } from "#rows/birth.ts";

export const smoothingRequested = fact("SmoothingRequested", {
	id: birth.fields.id,
	agentId: birth.fields.agentId,
	sessionId: birth.fields.sessionId,
	voyageId: birth.fields.voyageId,
	createsAgent: birth.fields.createsAgent,
	cwd: birth.fields.cwd,
});
