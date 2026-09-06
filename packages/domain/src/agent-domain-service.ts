import type { IntentDemandRegistration } from "@antumbra/intent-demand";
import type { AnyIntentKind, IntentKind } from "@antumbra/kernel";
import type { SiestaFields, WakeFields } from "@antumbra/sessions";
import { Context } from "effect";
import type { RetireFields } from "#retire.ts";
import type { SmoothFields, SmoothPieceFields } from "#smoothing/fields.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export class AgentDomain extends Context.Service<
	AgentDomain,
	{
		readonly kinds: ReadonlyArray<AnyIntentKind>;
		readonly intentDemands: ReadonlyArray<IntentDemandRegistration>;
		readonly retire: IntentKind<RetireFields>;
		readonly siesta: IntentKind<SiestaFields>;
		readonly smooth: IntentKind<SmoothFields>;
		readonly smoothPiece: IntentKind<SmoothPieceFields>;
		readonly spawn: IntentKind<SpawnFields>;
		readonly wake: IntentKind<WakeFields>;
	}
>()("@antumbra/domain/AgentDomain") {}
