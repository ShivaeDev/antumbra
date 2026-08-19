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
import type { ChangesReturn } from "#changes-requirements.ts";

export type {
	AdoptChangeFailure,
	AdoptChangeInput,
	OpenChangeFailure,
	OpenChangeInput,
	SubmitChangeFailure,
	SubmitChangeInput,
} from "@antumbra/changes";

export const adoptChange = Effect.fn("changes.adoptChange")(function* (
	input: AdoptChangeInput,
): ChangesReturn<ChangeRow, AdoptChangeFailure> {
	const changes = yield* Changes;
	return yield* changes.adopt(input);
});

export const openChange = Effect.fn("changes.openChange")(function* (
	input: OpenChangeInput,
): ChangesReturn<ChangeRow, OpenChangeFailure> {
	const changes = yield* Changes;
	return yield* changes.open(input);
});

export const submitChange = Effect.fn("changes.submitChange")(function* (
	input: SubmitChangeInput,
): ChangesReturn<ChangeRow, SubmitChangeFailure> {
	const changes = yield* Changes;
	return yield* changes.submit(input);
});
