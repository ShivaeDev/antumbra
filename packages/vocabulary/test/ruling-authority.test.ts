import { decodeStoredRulingAuthority } from "@antumbra/vocabulary/ruling";
import { expect, it } from "@effect/vitest";

it("retains the ruling and the unknown stored word in the refusal", () => {
	expect(decodeStoredRulingAuthority("ruling-1", "bosun")).toMatchObject({
		failure: {
			_tag: "StoredRulingValueInvalid",
			field: "authority",
			rulingId: "ruling-1",
			value: "bosun",
		},
	});
});
