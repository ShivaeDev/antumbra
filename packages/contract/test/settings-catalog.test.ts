import { expect, it } from "@effect/vitest";
import { SETTINGS } from "#index.ts";

it("leaves tool calls unfolded until the admiral asks", () => {
	expect(SETTINGS.foldToolCalls.kind).toBe("flag");
	expect(SETTINGS.foldToolCalls.fallback).toBe(false);
});
