import type { Runner } from "@antumbra/plugin-api";
import { Context, Layer } from "effect";

export class ResourceReclaimRunners extends Context.Service<
	ResourceReclaimRunners,
	ReadonlyMap<string, Runner>
>()("@antumbra/resource-reclamation/ResourceReclaimRunners") {}

export const ResourceReclaimRunnersLive = (
	runners: ReadonlyMap<string, Runner>,
) => Layer.succeed(ResourceReclaimRunners)(runners);
