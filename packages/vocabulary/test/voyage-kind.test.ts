import { decodeStoredVoyageKind } from "@antumbra/vocabulary/voyage";
import { expect, it } from "@effect/vitest";

it("retains the voyage and the unknown stored word in the refusal", () => {
	expect(decodeStoredVoyageKind("voyage-1", "tender")).toMatchObject({
		failure: {
			_tag: "StoredVoyageKindInvalid",
			value: "tender",
			voyageId: "voyage-1",
		},
	});
	expect(decodeStoredVoyageKind("voyage-1", null)).toMatchObject({
		failure: { _tag: "StoredVoyageKindInvalid", value: null },
	});
});
