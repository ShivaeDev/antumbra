import { Schema } from "effect";
import { type AgentPrompt, agentPrompt } from "#mint.ts";

export const MergeConflicts = Schema.Struct({
	baseRef: Schema.String,
	headRef: Schema.String,
	reference: Schema.String,
	repo: Schema.String,
});
export type MergeConflicts = typeof MergeConflicts.Type;

export const ChecksFailed = Schema.Struct({
	headRef: Schema.String,
	reference: Schema.String,
	repo: Schema.String,
});
export type ChecksFailed = typeof ChecksFailed.Type;

export const UnresolvedReviews = Schema.Struct({
	headRef: Schema.String,
	reference: Schema.String,
	repo: Schema.String,
});
export type UnresolvedReviews = typeof UnresolvedReviews.Type;

export const mergeConflicts = (input: MergeConflicts): AgentPrompt =>
	agentPrompt(
		`Change ${input.reference} in ${input.repo} has merge conflicts: ${input.headRef} no longer merges cleanly into ${input.baseRef}.

Bring ${input.headRef} up to date with ${input.baseRef} and resolve the conflicts. Keep what both sides meant — a conflict settled by dropping one side is a change nobody asked for. Push once the branch merges cleanly, and say what you resolved.`,
	);

export const checksFailed = (input: ChecksFailed): AgentPrompt =>
	agentPrompt(
		`Checks are failing on change ${input.reference} in ${input.repo}, on branch ${input.headRef}.

Read the failing checks on the change, find what actually broke, and fix it. Never disable, skip, or weaken a check to make it pass. If a check failed for something you did not cause, say which one and why.`,
	);

export const unresolvedReviews = (input: UnresolvedReviews): AgentPrompt =>
	agentPrompt(
		`Change ${input.reference} in ${input.repo} has review comments waiting on branch ${input.headRef}.

Read the unresolved threads on the change and answer every one: change the code where the reviewer is right, and say why where you disagree. Push the changes together, then reply on the threads you addressed.`,
	);
