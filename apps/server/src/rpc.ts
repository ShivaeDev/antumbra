import { artifactContent } from "@antumbra/domain-artifacts/queries/content.ts";
import { InputsRpc } from "@antumbra/domain-inputs/commands/submit.ts";
import { LifecycleRpc } from "@antumbra/domain-lifecycle/commands/restart.ts";
import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { StartsRpc } from "@antumbra/domain-starts/commands/submit.ts";
import { assemble } from "@antumbra/platform-rpc/group.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { features } from "#features.ts";

export const rpc = assemble(
	features,
	artifactContent.middleware(Token),
	InputsRpc.middleware(Token),
	TranscriptRpc.middleware(Token),
	LifecycleRpc.middleware(Token),
	RunnerRpc,
	StartsRpc.middleware(Token),
);
