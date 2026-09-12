import { Cause, Option } from "effect";

const SAID = "The change could not be saved";

export const messageOf = (cause: Cause.Cause<unknown>): string => {
	const failure = Cause.findErrorOption(cause);
	return Option.isSome(failure) && failure.value instanceof Error && failure.value.message !== "" ? failure.value.message : SAID;
};
