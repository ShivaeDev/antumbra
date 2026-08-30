import type { BoardsService } from "@antumbra/boards";
import type { IntentDemandRegistration } from "@antumbra/intent-demand";
import type { AnyIntentKind, IntentKind } from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";
import type { BackendFailure } from "@antumbra/plugin-api";
import type { AgentPrompt } from "@antumbra/prompts";
import type { RepoRegistry } from "@antumbra/repos";
import type { SessionInputDraft } from "@antumbra/session-inputs";
import type { StoredAgentStatusInvalid } from "@antumbra/vocabulary/agent-runtime";
import { Context, type Effect } from "effect";
import type { BackendCapacities } from "#backend-capacity.ts";
import type { ChangeProcedures } from "#change-procedures.ts";
import type { SessionNotLive } from "#errors.ts";
import type { RetireFields } from "#retire.ts";
import type { SessionSendReceipt, SessionSendRefused } from "#session-send.ts";
import type { SiestaFields } from "#session-siesta.ts";
import type { WakeFields } from "#session-wake.ts";
import type { SpawnFields } from "#spawn-fields.ts";
import type { VoyageProcedures } from "#voyages.ts";

// why: exposed but not installed as a gate — kernel gates are global, so a
// birth ceiling would block retire alongside spawn. Installing it waits for
// kind-scoped gate policies.
export const AGENTS_ALIVE_GAUGE = "agents.alive";

export class AgentDomain extends Context.Service<
	AgentDomain,
	{
		readonly backendCapacities: BackendCapacities;
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
		readonly imageInputBackends: ReadonlySet<string>;
		readonly intentDemands: ReadonlyArray<IntentDemandRegistration>;
		readonly repos: RepoRegistry;
		readonly retryResourceReclaim: Effect.Effect<void>;
		readonly reopenSessionStarts: Effect.Effect<void>;
		readonly retire: IntentKind<RetireFields>;
		// why: the admiral's own words take the turn-boundary lane — the domain
		// picks the delivery verb, never the backend. The words themselves come
		// from the catalog, so this seam names the branded type and prose
		// assembled anywhere else does not compile.
		readonly sendToSession: (
			sessionId: string,
			text: AgentPrompt,
		) => Effect.Effect<void, SessionSendRefused>;
		// why: the draft arrives whole because admitting it and taking custody of
		// it are one act — the backend is asked whether it can receive these parts
		// before any of them is normalized or written down, which only holds while
		// one seam owns both halves.
		readonly sendSessionInput: (
			draft: SessionInputDraft,
		) => Effect.Effect<SessionSendReceipt, SessionSendRefused>;
		// why: which root Sessions this process is holding right now. A projection
		// asks the fabric because the row cannot know it, and the answer is what
		// separates a Session listening with nothing to do from one whose process
		// has been reclaimed.
		readonly sessionsAttached: Effect.Effect<ReadonlySet<string>>;
		// why: which root Sessions are carrying a delegated conversation on the
		// stream they hold. Asked of the acquisition for the same reason
		// attachment is: a node row says what the record still owes an ending,
		// which is a different question from what is running now.
		readonly sessionsDelegating: Effect.Effect<ReadonlySet<string>>;
		readonly siesta: IntentKind<SiestaFields>;
		readonly spawn: IntentKind<SpawnFields>;
		// why: the one act that puts a Session back on a provider. Nothing in
		// Antumbra asks for it on its own — a hail, a send, or a Piece already
		// assigned to this Session is what submits one.
		readonly wake: IntentKind<WakeFields>;
		readonly voyages: VoyageProcedures;
	}
>()("@antumbra/domain/AgentDomain") {}
