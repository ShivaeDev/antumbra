import { Effect } from "effect";
import type { ChangeRow } from "#change-rows.ts";
import {
	type AdoptChangeFailure,
	type AdoptChangeInput,
	ChangeSubmissions,
	type OpenChangeFailure,
	type OpenChangeInput,
	type SubmitChangeFailure,
	type SubmitChangeInput,
} from "#change-submissions/change-submissions.ts";

export type {
	AdoptChangeFailure,
	AdoptChangeInput,
	OpenChangeFailure,
	OpenChangeInput,
	SubmitChangeFailure,
	SubmitChangeInput,
} from "#change-submissions/change-submissions.ts";

export const adoptChange = (
	input: AdoptChangeInput,
): Effect.Effect<ChangeRow, AdoptChangeFailure, ChangeSubmissions> =>
	Effect.flatMap(ChangeSubmissions, (changes) => changes.adopt(input));

export const openChange = (
	input: OpenChangeInput,
): Effect.Effect<ChangeRow, OpenChangeFailure, ChangeSubmissions> =>
	Effect.flatMap(ChangeSubmissions, (changes) => changes.open(input));

export const submitChange = (
	input: SubmitChangeInput,
): Effect.Effect<ChangeRow, SubmitChangeFailure, ChangeSubmissions> =>
	Effect.flatMap(ChangeSubmissions, (changes) => changes.submit(input));
