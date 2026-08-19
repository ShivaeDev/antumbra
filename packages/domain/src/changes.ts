import {
	type AdoptChangeFailure,
	type AdoptChangeInput,
	type ChangeRow,
	Changes,
	type OpenChangeFailure,
	type OpenChangeInput,
	type SubmitChangeFailure,
	type SubmitChangeInput,
} from "@antumbra/changes";
import { Effect } from "effect";

export type {
	AdoptChangeFailure,
	AdoptChangeInput,
	OpenChangeFailure,
	OpenChangeInput,
	SubmitChangeFailure,
	SubmitChangeInput,
} from "@antumbra/changes";

export const adoptChange = (
	input: AdoptChangeInput,
): Effect.Effect<ChangeRow, AdoptChangeFailure, Changes> =>
	Effect.flatMap(Changes, (changes) => changes.adopt(input));

export const openChange = (
	input: OpenChangeInput,
): Effect.Effect<ChangeRow, OpenChangeFailure, Changes> =>
	Effect.flatMap(Changes, (changes) => changes.open(input));

export const submitChange = (
	input: SubmitChangeInput,
): Effect.Effect<ChangeRow, SubmitChangeFailure, Changes> =>
	Effect.flatMap(Changes, (changes) => changes.submit(input));
