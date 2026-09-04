import { expect, it } from "@effect/vitest";
import { berthedCharter } from "#charter-berths.ts";

it("leaves the charter unchanged when no repository is registered", () => {
	const charter = "Investigate lost edits after restart.";
	for (const role of ["captain", "crew"] as const) {
		expect(berthedCharter({ berths: [], charter, moorageRoot: "/work/agent-1", role })).toBe(charter);
	}
});
