import { expect, it } from "@effect/vitest";
import { draft } from "#draft.ts";

it("reverts to the values the server answered last, not to the ones the edit began from", () => {
	const editing = draft({ name: "First" });
	editing.values.set({ name: "Edited" });
	editing.receive({ name: "Second" });
	expect(editing.values.value).toEqual({ name: "Edited" });
	editing.revert();
	expect(editing.values.value).toEqual({ name: "Second" });
});

it("takes an answer straight to the field while the draft is clean", () => {
	const editing = draft({ name: "First" });
	editing.receive({ name: "Second" });
	expect(editing.values.value).toEqual({ name: "Second" });
});
