import { Effect, Option } from "effect";
import { changeById } from "#by-id.ts";
import { ChangeNotAddressable } from "#errors.ts";

export const addressable = Effect.fn("Changes.addressable")(function* (changeId: string) {
	const found = yield* changeById(changeId);
	if (Option.isNone(found) || found.value.externalId === null) {
		return yield* new ChangeNotAddressable({ changeId });
	}
	return found.value;
});
