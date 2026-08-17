import type { StoredAgentStatusInvalid } from "@antumbra/agent-runtime-vocabulary";
import type { BoardsService } from "@antumbra/boards";
import type { AnyIntentKind, IntentKind } from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";
import type { BackendFailure } from "@antumbra/plugin-api";
import { Context, type Deferred, type Effect } from "effect";
import type { ChangeProcedures } from "#change-procedures.ts";
import type { KernelReach } from "#deps.ts";
import type { SessionNotLive } from "#errors.ts";
import type { RepoRegistry } from "#registry.ts";
import type { RetireFields } from "#retire.ts";
import type { RecoveryFields } from "#session-recovery.ts";
import type { SiestaFields } from "#session-siesta.ts";
import type { SpawnFields } from "#spawn.ts";
import type { VoyageProcedures } from "#voyages.ts";

// why: exposed but not installed as a gate — kernel gates are global, so a
// birth ceiling would block retire alongside spawn. Installing it waits for
// kind-scoped gate policies.
export const AGENTS_ALIVE_GAUGE = "agents.alive";

export class AgentDomain extends Context.Service<
	AgentDomain,
	{
		readonly backends: ReadonlyArray<string>;
		readonly boards: BoardsService;
		readonly changes: ChangeProcedures;
		readonly gauges: Readonly<
			Record<
				string,
				Effect.Effect<number, PrismaError | StoredAgentStatusInvalid>
			>
		>;
		readonly interruptSession: (
			sessionId: string,
		) => Effect.Effect<void, BackendFailure | SessionNotLive>;
		// why: filled in by the layer that has the kernel; a stand_down and a
		// hail wait on it rather than the domain naming a scheduler it sits below.
		readonly kernelReach: Deferred.Deferred<KernelReach>;
		readonly kinds: ReadonlyArray<AnyIntentKind>;
		readonly repos: RepoRegistry;
		readonly recover: IntentKind<RecoveryFields>;
		readonly retire: IntentKind<RetireFields>;
		readonly siesta: IntentKind<SiestaFields>;
		readonly spawn: IntentKind<SpawnFields>;
		readonly voyages: VoyageProcedures;
	}
>()("@antumbra/domain/AgentDomain") {}
