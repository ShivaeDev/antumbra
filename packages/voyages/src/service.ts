import type { AgentRole } from "@antumbra/platform-vocabulary/agent-role.ts";
import { Context, type Effect, type Option } from "effect";
import type { VoyageNotFound } from "#errors.ts";
import type { OpenVoyageInput, Voyage } from "#model.ts";

export interface VoyagesService {
	readonly assignAgent: (voyageId: string, agentId: string, role: string) => Effect.Effect<void>;
	readonly byId: (voyageId: string) => Effect.Effect<Option.Option<Voyage>>;
	readonly captainRole: (voyageId: string) => Effect.Effect<AgentRole>;
	readonly ensureFlagship: (input: OpenVoyageInput) => Effect.Effect<void>;
	readonly list: () => Effect.Effect<ReadonlyArray<Voyage>>;
	readonly open: (input: OpenVoyageInput) => Effect.Effect<Voyage>;
	readonly setFocus: (voyageId: string, focused: boolean) => Effect.Effect<void, VoyageNotFound>;
	readonly verifyExists: (voyageId: string) => Effect.Effect<void, VoyageNotFound>;
}

export class Voyages extends Context.Service<Voyages, VoyagesService>()("@antumbra/voyages/Voyages") {}

export type { OpenVoyageInput, Voyage } from "#model.ts";
