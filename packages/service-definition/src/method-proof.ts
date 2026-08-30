import type { Effect, Scope } from "effect";
import type { AnyMethod, GenericMethodDescriptor, HasDistinctCallSignatures } from "#generic-method.ts";
import type { RequirementRecord, RequirementsOf } from "#service-requirements.ts";

export type MethodEntry = AnyMethod | GenericMethodDescriptor<AnyMethod>;

export type MethodRecord = Readonly<Record<string, AnyMethod>>;

export type MethodInventory = Readonly<Record<string, unknown>>;

export type RuntimeMethodInventory = Readonly<Record<string, MethodEntry>>;

interface GenericOrStructurallyOverloadedMethodsAreUnsupported {
	readonly _serviceDefinitionError: "generic and structurally overloaded methods are unsupported";
}

interface GenericMethodWithDeclaredRequirementsIsUnsupported {
	readonly _serviceDefinitionError: "generic methods cannot subtract declared service requirements";
}

type MethodRequirements<Method> = Method extends (...arguments_: ReadonlyArray<never>) => Effect.Effect<unknown, unknown, infer Requirements>
	? Requirements
	: never;

interface MethodHasUndeclaredServiceRequirements {
	readonly _serviceDefinitionError: "method has service requirements absent from the service declaration";
}

interface ServiceMembersMustBeMethods {
	readonly _serviceDefinitionError: "service members must be methods";
}

type OrdinaryMethodProof<Method, Requirements extends RequirementRecord> = [
	Exclude<MethodRequirements<Method>, RequirementsOf<Requirements> | Scope.Scope>,
] extends [never]
	? Method
	: MethodHasUndeclaredServiceRequirements;

type SupportedMethod<Method, Requirements extends RequirementRecord> =
	Method extends GenericMethodDescriptor<AnyMethod>
		? Requirements extends readonly []
			? Method
			: GenericMethodWithDeclaredRequirementsIsUnsupported
		: Method extends AnyMethod
			? HasDistinctCallSignatures<Method> extends true
				? GenericOrStructurallyOverloadedMethodsAreUnsupported
				: Method extends (...arguments_: infer Arguments) => infer Result
					? ((...arguments_: Arguments) => Result) extends Method
						? OrdinaryMethodProof<Method, Requirements>
						: GenericOrStructurallyOverloadedMethodsAreUnsupported
					: GenericOrStructurallyOverloadedMethodsAreUnsupported
			: ServiceMembersMustBeMethods;

export type MethodProof<Methods extends MethodInventory, Requirements extends RequirementRecord> = {
	readonly [Name in keyof Methods]: SupportedMethod<Methods[Name], Requirements>;
};
