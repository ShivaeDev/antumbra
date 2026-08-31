import { decodeStoredVoyageKind, VoyageKindSchema } from "@antumbra/vocabulary/voyage";
import { expect, it } from "@effect/vitest";
import { Result } from "effect";

it("decodes every kind a voyage may be stored as", () => {
	expect([...VoyageKindSchema.literals]).toEqual(["voyage", "flagship"]);
	expect(decodeStoredVoyageKind("voyage-1", "voyage")).toEqual(Result.succeed("voyage"));
	expect(decodeStoredVoyageKind("voyage-1", "flagship")).toEqual(Result.succeed("flagship"));
});

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
