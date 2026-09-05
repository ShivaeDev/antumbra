import type { IntentDemandRegistration } from "@antumbra/intent-demand";
import type { AnyIntentKind, IntentKind } from "@antumbra/kernel";
import type { SiestaFields, WakeFields } from "@antumbra/sessions";
import { Context, type Effect } from "effect";
import type { RetireFields } from "#retire.ts";
import type { SpawnFields } from "#spawn-fields.ts";
import type { VoyageProcedures } from "#voyages/service.ts";

export class AgentDomain extends Context.Service<
	AgentDomain,
	{
		readonly kinds: ReadonlyArray<AnyIntentKind>;
		readonly intentDemands: ReadonlyArray<IntentDemandRegistration>;
		readonly retryResourceReclaim: Effect.Effect<void>;
		readonly retire: IntentKind<RetireFields>;
		readonly sessionsAttached: Effect.Effect<ReadonlySet<string>>;
		readonly siesta: IntentKind<SiestaFields>;
		readonly spawn: IntentKind<SpawnFields>;
		readonly wake: IntentKind<WakeFields>;
		readonly voyages: VoyageProcedures;
	}
>()("@antumbra/domain/AgentDomain") {}
