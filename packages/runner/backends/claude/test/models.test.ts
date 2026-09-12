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

it("drops the alias row Claude lists and marks the model it stands for", () => {
	expect(modelChoices([listed("default", OPUS, "Default"), listed("opus", OPUS, "Opus 5"), listed("sonnet", "claude-sonnet-5", "Sonnet 5")])).toEqual(
		[
			{ defaultEffort: null, efforts: ["low", "high"], id: "opus", isDefault: true, name: "Opus 5" },
			{ defaultEffort: null, efforts: ["low", "high"], id: "sonnet", isDefault: false, name: "Sonnet 5" },
		],
	);
});
