import { type AgentPrompt, type CaptainCharter, captainCharter, flagshipCharter } from "@antumbra/prompts";
import type { VoyageKind } from "@antumbra/vocabulary/voyage";

export const charterForKind = (kind: VoyageKind, input: CaptainCharter): AgentPrompt =>
	kind === "flagship" ? flagshipCharter(input) : captainCharter(input);
