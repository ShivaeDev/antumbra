import { Effect, Ref } from "effect";
import type { IntentDemandHealth } from "#health-reading.ts";

export const makeHealth = (health: Ref.Ref<ReadonlyMap<string, IntentDemandHealth>>) => Effect.fn("IntentDemand.health")(() => Ref.get(health));
