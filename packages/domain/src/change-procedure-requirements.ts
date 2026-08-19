import { Changes } from "@antumbra/changes";
import { DomainFeeds } from "@antumbra/domain-feeds";
import type { ChangeHost } from "@antumbra/plugin-api";
import type { ServiceRequirements } from "@antumbra/service-definition";
import { Context } from "effect";
import { VoyageWorldSource } from "#voyage-world.ts";

// why: immutable plugin registration completes before Domain composition; this
// service makes that runtime input an explicit dependency of host procedures.
export class ChangeHosts extends Context.Service<
	ChangeHosts,
	ReadonlyMap<string, ChangeHost>
>()("@antumbra/domain/ChangeHosts") {}

export const changeProcedureRequirements = [
	ChangeHosts,
	Changes,
	DomainFeeds,
	VoyageWorldSource,
] as const;

export type ChangeProcedureRequirements<
	Success,
	Failure = never,
	Passthrough = never,
> = ServiceRequirements<
	typeof changeProcedureRequirements,
	Success,
	Failure,
	Passthrough
>;
