import type { BoundaryRule, CompiledBoundaryRule, SanctionedException } from "#boundaries/model.ts";

export const sanctionedOf = (rule: BoundaryRule): readonly SanctionedException[] =>
	rule.kind === "negative-fence" && rule.from.kind === "workspace-except" ? rule.from.sanctioned : [];

export const describeException = (exception: SanctionedException): string =>
	` Sanctioned exception — ${exception.ruling}: packages/${exception.package} may make this import. ${exception.rationale}`;

export const exceptionFailure = (
	rule: BoundaryRule,
	compiled: CompiledBoundaryRule | undefined,
	exception: SanctionedException,
): string | undefined => {
	if (exception.package.trim().length === 0 || exception.ruling.trim().length === 0 || exception.rationale.trim().length === 0) {
		return `Sanctioned exception in ${rule.name} needs a package, a ruling, and a rationale`;
	}
	const consumer = `packages/${exception.package}/src/index.ts`;
	return compiled !== undefined && new RegExp(compiled.from.path).test(consumer)
		? `Sanctioned exception "${exception.ruling}" does not exempt packages/${exception.package} from ${rule.name}`
		: undefined;
};
