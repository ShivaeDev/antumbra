import { type CaptainCharter, captainCharter } from "@antumbra/prompts/charter-captain.ts";
import { flagshipCharter } from "@antumbra/prompts/charter-flagship.ts";
import type { AgentPrompt } from "@antumbra/prompts/mint.ts";
import type { VoyageKind } from "@antumbra/vocabulary/voyage.ts";

export const charterForKind = (kind: VoyageKind, input: CaptainCharter): AgentPrompt =>
	kind === "flagship" ? flagshipCharter(input) : captainCharter(input);
