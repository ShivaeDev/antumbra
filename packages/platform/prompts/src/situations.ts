import * as situations from "@antumbra/platform-vocabulary/change-situations.ts";
import { agentPrompt } from "#mint.ts";

export const mergeConflicts = (input: situations.SituationInput) => agentPrompt(situations.mergeConflicts(input).text);
export const checksFailed = (input: situations.SituationInput) => agentPrompt(situations.checksFailed(input).text);
export const unresolvedReviews = (input: situations.SituationInput) => agentPrompt(situations.unresolvedReviews(input).text);
export const feedbackWaiting = (input: situations.SituationInput) => agentPrompt(situations.feedbackWaiting(input).text);
