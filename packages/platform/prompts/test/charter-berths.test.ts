import { expect, it } from "@effect/vitest";
import { berthsSection } from "#charter-berths.ts";

it("leaves out the berths section when the agent has no moorage", () => {
	for (const role of ["captain", "crew"] as const) {
		expect(berthsSection({ berths: [], moorageRoot: null }, role)).toEqual([]);
	}
});

it("names the working directory before any repository is registered", () => {
	const rendered = berthsSection({ berths: [], moorageRoot: "/moorage/agent-1" }, "captain").join("\n");
	expect(rendered).toContain("Working directory: /moorage/agent-1");
	expect(rendered).toContain("/moorage/agent-1/scratch");
	expect(rendered).not.toContain("branch");
});
