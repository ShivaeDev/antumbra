import { artifactContent } from "@antumbra/domain-artifacts/queries/content.ts";
import { InputsRpc } from "@antumbra/domain-inputs/commands/submit.ts";
import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { StartsRpc } from "@antumbra/domain-starts/commands/submit.ts";
import { group } from "@antumbra/platform-rpc/group.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { LifecycleRpc } from "@antumbra/platform-runner/lifecycle.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { features } from "#features.ts";

export const rpc = group(features).merge(
	artifactContent.middleware(Token),
	InputsRpc.middleware(Token),
	TranscriptRpc.middleware(Token),
	LifecycleRpc,
	RunnerRpc,
	StartsRpc.middleware(Token),
);
