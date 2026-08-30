import { decodeStoredRulingAuthority, RulingAuthoritySchema } from "@antumbra/vocabulary/ruling";
import { expect, it } from "@effect/vitest";
import { Result } from "effect";

it("decodes every authority a ruling may be answered by", () => {
	expect([...RulingAuthoritySchema.literals]).toEqual(["admiral", "flagship", "captain"]);
	expect(decodeStoredRulingAuthority("ruling-1", "admiral")).toEqual(Result.succeed("admiral"));
	expect(decodeStoredRulingAuthority("ruling-1", "flagship")).toEqual(Result.succeed("flagship"));
	expect(decodeStoredRulingAuthority("ruling-1", "captain")).toEqual(Result.succeed("captain"));
});

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
