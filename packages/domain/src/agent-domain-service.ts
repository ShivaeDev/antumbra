import type { BoardsService } from "@antumbra/boards";
import type { IntentDemandRegistration } from "@antumbra/intent-demand";
import type { AnyIntentKind, IntentKind } from "@antumbra/kernel";
import type { BackendFailure } from "@antumbra/plugin-api";
import type { AgentPrompt } from "@antumbra/prompts";
import type { BackendCapacityService } from "@antumbra/provider-capacity";
import type { RepoRegistry } from "@antumbra/repos";
import type { SessionInputDraft } from "@antumbra/session-inputs";
import type { SessionSendReceipt, SessionSendRefused, SiestaFields, WakeFields } from "@antumbra/sessions";
import { Context, type Effect } from "effect";
import type { SessionNotLive } from "#errors.ts";
import type { RetireFields } from "#retire.ts";
import type { SpawnFields } from "#spawn-fields.ts";
import type { VoyageProcedures } from "#voyages/service.ts";

export class AgentDomain extends Context.Service<
	AgentDomain,
	{
		readonly backendCapacities: BackendCapacityService;
		readonly backends: ReadonlyArray<string>;
		readonly boards: BoardsService;
		readonly closeSessionStarts: Effect.Effect<void>;
		readonly interruptSession: (sessionId: string) => Effect.Effect<void, BackendFailure | SessionNotLive>;
		readonly kinds: ReadonlyArray<AnyIntentKind>;
		readonly imageInputBackends: ReadonlySet<string>;
		readonly intentDemands: ReadonlyArray<IntentDemandRegistration>;
		readonly repos: RepoRegistry;
		readonly retryResourceReclaim: Effect.Effect<void>;
		readonly reopenSessionStarts: Effect.Effect<void>;
		readonly retire: IntentKind<RetireFields>;
		readonly sendToSession: (sessionId: string, text: AgentPrompt) => Effect.Effect<void, SessionSendRefused>;
		readonly sendSessionInput: (draft: SessionInputDraft) => Effect.Effect<SessionSendReceipt, SessionSendRefused>;
		readonly sessionsAttached: Effect.Effect<ReadonlySet<string>>;
		readonly sessionsDelegating: Effect.Effect<ReadonlySet<string>>;
		readonly siesta: IntentKind<SiestaFields>;
		readonly spawn: IntentKind<SpawnFields>;
		readonly wake: IntentKind<WakeFields>;
		readonly voyages: VoyageProcedures;
	}
>()("@antumbra/domain/AgentDomain") {}
