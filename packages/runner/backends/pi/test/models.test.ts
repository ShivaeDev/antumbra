import { expect, it } from "vitest";
import { modelChoices } from "#models.ts";

it("offers every thinking level for each model pi has credentials for", () => {
	expect(modelChoices([{ id: "anthropic/claude-sonnet-4-5", name: "Claude Sonnet 4.5 (anthropic)" }])).toEqual([
		{
			efforts: ["off", "minimal", "low", "medium", "high", "xhigh", "max"],
			id: "anthropic/claude-sonnet-4-5",
			isDefault: false,
			name: "Claude Sonnet 4.5 (anthropic)",
		},
	]);
});
