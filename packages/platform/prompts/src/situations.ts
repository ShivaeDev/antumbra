import * as situations from "@antumbra/platform-vocabulary/change-situations.ts";
import { agentPrompt } from "#mint.ts";

export const mergeConflicts = (input: Parameters<typeof situations.mergeConflicts>[0]) => agentPrompt(situations.mergeConflicts(input));
export const checksFailed = (input: Parameters<typeof situations.checksFailed>[0]) => agentPrompt(situations.checksFailed(input));
export const unresolvedReviews = (input: Parameters<typeof situations.unresolvedReviews>[0]) => agentPrompt(situations.unresolvedReviews(input));
