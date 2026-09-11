import { type CaptainCharter, captainCharter } from "@antumbra/platform-prompts/charter-captain.ts";
import { flagshipCharter } from "@antumbra/platform-prompts/charter-flagship.ts";
import type { AgentPrompt } from "@antumbra/platform-prompts/mint.ts";
import type { VoyageKind } from "@antumbra/platform-vocabulary/voyage.ts";

export const charterForKind = (kind: VoyageKind, input: CaptainCharter): AgentPrompt =>
	kind === "flagship" ? flagshipCharter(input) : captainCharter(input);
