import type { ArtifactFailure, ArtifactMarkdown } from "@antumbra/artifacts";
import type { BoardsService } from "@antumbra/boards";
import type { IntentDemandRegistration } from "@antumbra/intent-demand";
import type { AnyIntentKind, IntentKind } from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";
import type { BackendFailure } from "@antumbra/plugin-api";
import type { RepoRegistry } from "@antumbra/repos";
import type { StoredAgentStatusInvalid } from "@antumbra/vocabulary/agent-runtime";
import { Context, type Effect } from "effect";
import type { ChangeProcedures } from "#change-procedures.ts";
import type { SessionNotLive } from "#errors.ts";
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
		readonly closeSessionStarts: Effect.Effect<void>;
		readonly gauges: Readonly<
			Record<
				string,
				Effect.Effect<number, PrismaError | StoredAgentStatusInvalid>
			>
		>;
		readonly interruptSession: (
			sessionId: string,
		) => Effect.Effect<void, BackendFailure | SessionNotLive>;
		readonly kinds: ReadonlyArray<AnyIntentKind>;
		readonly intentDemands: ReadonlyArray<IntentDemandRegistration>;
		readonly repos: RepoRegistry;
		readonly retryResourceReclaim: Effect.Effect<void>;
		readonly recover: IntentKind<RecoveryFields>;
		readonly reopenSessionStarts: Effect.Effect<void>;
		readonly readArtifactMarkdown: (
			artifactId: string,
		) => Effect.Effect<ArtifactMarkdown, ArtifactFailure>;
		readonly retire: IntentKind<RetireFields>;
		readonly siesta: IntentKind<SiestaFields>;
		readonly spawn: IntentKind<SpawnFields>;
		readonly voyages: VoyageProcedures;
	}
>()("@antumbra/domain/AgentDomain") {}
