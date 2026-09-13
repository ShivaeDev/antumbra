import { artifactContent } from "@antumbra/domain-artifacts/queries/content.ts";
import { InputsRpc } from "@antumbra/domain-inputs/commands/submit.ts";
import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { DebugRpc } from "@antumbra/platform-rpc/debug.ts";
import { group } from "@antumbra/platform-rpc/group.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { LifecycleRpc } from "@antumbra/platform-runner/lifecycle.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { features } from "#features.ts";

export const rpc = group(features).merge(
	DebugRpc.middleware(Token),
	artifactContent.middleware(Token),
	InputsRpc.middleware(Token),
	TranscriptRpc.middleware(Token),
	LifecycleRpc,
	RunnerRpc,
);
