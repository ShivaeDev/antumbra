import { expect, it } from "@effect/vitest";
import { berthsSection } from "#charter-berths.ts";

it("leaves out the berths section when no repository is registered", () => {
	for (const role of ["captain", "crew"] as const) {
		expect(berthsSection({ berths: [], moorageRoot: "/work/agent-1" }, role)).toEqual([]);
	}
});
