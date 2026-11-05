import { artifactContent } from "@antumbra/domain-artifacts/queries/content.ts";
import { TranscriptRpc } from "@antumbra/domain-sessions/queries/transcript-rpc.ts";
import { DebugRpc } from "@antumbra/platform-rpc/debug.ts";
import { Token } from "@antumbra/platform-rpc/token.ts";
import { LifecycleRpc } from "@antumbra/platform-runner/lifecycle.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import { AgentsContract } from "@antumbra/server-agents/contract.ts";
import { ArtifactsContract } from "@antumbra/server-artifacts/contract.ts";
import { BackendsContract } from "@antumbra/server-backends/contract.ts";
import { BoardsContract } from "@antumbra/server-boards/contract.ts";
import { CapacityContract } from "@antumbra/server-capacity/contract.ts";
import { ChangesContract } from "@antumbra/server-changes/contract.ts";
import { CostsContract } from "@antumbra/server-costs/contract.ts";
import { HoldsContract } from "@antumbra/server-holds/contract.ts";
import { InputsContract } from "@antumbra/server-inputs/contract.ts";
import { LifecycleContract } from "@antumbra/server-lifecycle/contract.ts";
import { MailContract } from "@antumbra/server-mail/contract.ts";
import { PiecesContract } from "@antumbra/server-pieces/contract.ts";
import { ReclamationContract } from "@antumbra/server-reclamation/contract.ts";
import { ReportsContract } from "@antumbra/server-reports/contract.ts";
import { ReposContract } from "@antumbra/server-repos/contract.ts";
import { RoleSettingsContract } from "@antumbra/server-role-settings/contract.ts";
import { RulingsContract } from "@antumbra/server-rulings/contract.ts";
import { SessionsContract } from "@antumbra/server-sessions/contract.ts";
import { SettingsContract } from "@antumbra/server-settings/contract.ts";
import { SupervisionContract } from "@antumbra/server-supervision/contract.ts";
import { VoyagesContract } from "@antumbra/server-voyages/contract.ts";
import { RpcGroup } from "effect/rpc";

export const rpc = RpcGroup.make()
	.merge(
		AgentsContract.application,
		ArtifactsContract.application,
		BackendsContract.application,
		BoardsContract.application,
		CapacityContract.application,
		ChangesContract.application,
		CostsContract.application,
		HoldsContract.application,
		InputsContract.application,
		LifecycleContract.application,
		MailContract.application,
		PiecesContract.application,
		ReclamationContract.application,
		ReportsContract.application,
		ReposContract.application,
		RoleSettingsContract.application,
		RulingsContract.application,
		SessionsContract.application,
		SettingsContract.application,
		SupervisionContract.application,
		VoyagesContract.application,
	)
	.middleware(Token)
	.merge(DebugRpc.middleware(Token), artifactContent.middleware(Token), TranscriptRpc.middleware(Token), LifecycleRpc, RunnerRpc);
