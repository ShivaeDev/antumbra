import { type AgentPrompt, type CaptainCharter, captainCharter, flagshipCharter } from "@antumbra/prompts";
import type { VoyageKind } from "@antumbra/vocabulary/voyage";

// why: what a captain is told at birth is decided by the kind of the voyage it
// is hailed for and by nothing else, so the flagship's captain hears its
// station from the record rather than from the caller that hailed it.
export const charterForKind = (kind: VoyageKind, input: CaptainCharter): AgentPrompt =>
	kind === "flagship" ? flagshipCharter(input) : captainCharter(input);
