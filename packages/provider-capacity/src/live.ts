import type { AgentBackend } from "@antumbra/plugin-api";
import { Layer } from "effect";
import { BackendCapacities } from "#service.ts";
import { CapacitySources } from "#sources.ts";

export const BackendCapacitiesLive = (backends: ReadonlyMap<string, AgentBackend>) =>
	BackendCapacities.layer.pipe(Layer.provide(Layer.succeed(CapacitySources)(backends)));
