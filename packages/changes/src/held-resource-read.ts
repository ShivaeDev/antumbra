import { HeldResourceRead } from "@antumbra/resource-reclamation";
import { Effect, Layer } from "effect";
import { Changes } from "#change-submissions/live.ts";

export const ChangeHeldResourceReadLive = Layer.effect(
	HeldResourceRead,
	Effect.map(Changes, (changes) => ({
		held: changes.heldResources,
	})),
);
