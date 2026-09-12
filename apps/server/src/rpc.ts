import { artifactContent } from "@antumbra/domain-artifacts/queries/content.ts";
import { SessionInputRpc } from "@antumbra/domain-inputs/commands/submit.ts";
import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { AdmiralRpc } from "@antumbra/domain-starts/commands/submit.ts";
import { assemble } from "@antumbra/platform-rpc/group.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { RestartRpc } from "@antumbra/platform-runner/lifecycle.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { features } from "#features.ts";

export const rpc = assemble(
	features,
	artifactContent.middleware(Token),
	SessionInputRpc.middleware(Token),
	TranscriptRpc.middleware(Token),
	RestartRpc,
	RunnerRpc,
	AdmiralRpc.middleware(Token),
);
