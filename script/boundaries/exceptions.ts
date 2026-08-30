import type { BoundaryRule, CompiledBoundaryRule, SanctionedException } from "#boundaries/model.ts";

export const sanctionedOf = (rule: BoundaryRule): readonly SanctionedException[] =>
	rule.kind === "negative-fence" && rule.from.kind === "workspace-except" ? rule.from.sanctioned : [];

// why: an exception that is not written down beside the rule it bends is
// indistinguishable from the rule having been quietly widened. The ruling and
// its reason travel into the generated configuration so the tool that reports a
// violation also reports who allowed the one package that is missing from it.
export const describeException = (exception: SanctionedException): string =>
	` Sanctioned exception — ${exception.ruling}: packages/${exception.package} may make this import. ${exception.rationale}`;

// why: the carve-out is proven against the expression the rule actually
// compiles to, not against the declaration that asked for it. A compiler that
// stopped threading exceptions into the selector would keep reading correctly
// and start forbidding the one import the admiral ruled in.
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
