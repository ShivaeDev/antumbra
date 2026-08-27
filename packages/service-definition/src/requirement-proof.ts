import type { Context, Scope } from "effect";
import type { RequirementRecord } from "#service-requirements.ts";

interface ScopeCannotBeDeclaredAsAServiceRequirement {
	readonly _serviceDefinitionError: "Scope.Scope is caller-owned and cannot be declared as a service requirement";
}

type ProveRequirement<Requirement> = Requirement extends Context.Service.Any
	? Context.Service.Identifier<Requirement> extends Scope.Scope
		? ScopeCannotBeDeclaredAsAServiceRequirement
		: Requirement
	: never;

export type RequirementProof<Requirements extends RequirementRecord> = {
	readonly [Index in keyof Requirements]: ProveRequirement<Requirements[Index]>;
};
