import type { AgentBackend } from "@antumbra/plugin-api";
import { Context } from "effect";

export class CapacitySources extends Context.Service<CapacitySources, ReadonlyMap<string, AgentBackend>>()(
	"@antumbra/provider-capacity/CapacitySources",
) {}
