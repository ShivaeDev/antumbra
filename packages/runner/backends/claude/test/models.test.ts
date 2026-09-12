import type { ModelInfo } from "@anthropic-ai/claude-agent-sdk";
import { expect, it } from "vitest";
import { modelChoices } from "#models.ts";

const OPUS = "claude-opus-5";

const listed = (value: string, resolvedModel: string, displayName: string): ModelInfo => ({
	description: displayName,
	displayName,
	resolvedModel,
	supportedEffortLevels: ["low", "high"],
	value,
});

it("drops the alias row Claude lists and marks the first model it stands for", () => {
	const offered = modelChoices([
		listed("default", OPUS, "Default"),
		listed("opus", OPUS, "Opus 5"),
		listed(OPUS, OPUS, "Opus 5 (pinned)"),
		listed("sonnet", "claude-sonnet-5", "Sonnet 5"),
	]);

	expect(offered).toEqual([
		{ defaultEffort: null, efforts: ["low", "high"], id: "opus", isDefault: true, name: "Opus 5" },
		{ defaultEffort: null, efforts: ["low", "high"], id: OPUS, isDefault: false, name: "Opus 5 (pinned)" },
		{ defaultEffort: null, efforts: ["low", "high"], id: "sonnet", isDefault: false, name: "Sonnet 5" },
	]);
});

it("marks no model when Claude lists no alias to recommend one", () => {
	expect(modelChoices([listed("opus", OPUS, "Opus 5"), listed("sonnet", "claude-sonnet-5", "Sonnet 5")]).some((model) => model.isDefault)).toBe(
		false,
	);
});
