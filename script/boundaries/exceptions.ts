import type { BoundaryRule, CompiledBoundaryRule, LocatePackage, SanctionedException } from "#boundaries/model.ts";

export const sanctionedOf = (rule: BoundaryRule): readonly SanctionedException[] =>
	rule.kind === "negative-fence" && rule.from.kind === "workspace-except" ? rule.from.sanctioned : [];

export const describeException = (exception: SanctionedException, locate: LocatePackage): string =>
	` Sanctioned exception — ${exception.ruling}: ${locate(exception.package)} may make this import. ${exception.rationale}`;

export const incompleteException = (rule: BoundaryRule, exception: SanctionedException): string | undefined =>
	exception.package.trim().length === 0 || exception.ruling.trim().length === 0 || exception.rationale.trim().length === 0
		? `Sanctioned exception in ${rule.name} needs a package, a ruling, and a rationale`
		: undefined;

export const exceptionFailure = (
	rule: BoundaryRule,
	compiled: CompiledBoundaryRule | undefined,
	exception: SanctionedException,
	locate: LocatePackage,
): string | undefined => {
	const location = locate(exception.package);
	return compiled !== undefined && new RegExp(compiled.from.path).test(`${location}/src/index.ts`)
		? `Sanctioned exception "${exception.ruling}" does not exempt ${location} from ${rule.name}`
		: undefined;
};
