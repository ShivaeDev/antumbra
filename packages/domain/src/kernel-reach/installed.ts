import type { WakeFields } from "@antumbra/sessions";
import type { Effect } from "effect";
import type { RouseRefused, SessionRouse, SpawnRefused } from "#kernel-rouse.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export interface KernelReachService {
	readonly queueSiesta: (sessionId: string) => Effect.Effect<void>;
	readonly rouseSession: (payload: WakeFields) => Effect.Effect<SessionRouse, RouseRefused>;
	readonly settleWakes: (sessionId: string) => Effect.Effect<void>;
	readonly submitSpawn: (payload: SpawnFields) => Effect.Effect<string, SpawnRefused>;
	readonly submitWake: (payload: WakeFields) => Effect.Effect<string, SpawnRefused>;
	readonly wakePending: (sessionId: string) => Effect.Effect<boolean, RouseRefused>;
}
