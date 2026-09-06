import { describeException, sanctionedOf } from "#boundaries/exceptions.ts";
import { compileSelector, escapeExpression } from "#boundaries/expressions.ts";
import type { BoundaryFixture, BoundaryPolicyInventory, BoundaryRule, CompiledBoundaryRule, LocatePackage } from "#boundaries/model.ts";
import { locatePackage, validatePolicyInventory } from "#boundaries/policy-inventory.ts";
import { validatePolicy } from "#boundaries/validation.ts";

const compileRule = (rule: BoundaryRule, locate: LocatePackage): CompiledBoundaryRule => ({
	comment: `${rule.rationale}${sanctionedOf(rule)
		.map((exception) => describeException(exception, locate))
		.join("")}`,
	from: {
		path: compileSelector(rule.kind === "negative-fence" ? rule.from : rule.consumers, locate),
	},
	name: rule.name,
	severity: "error",
	to: {
		path:
			rule.kind === "negative-fence"
				? compileSelector(rule.to, locate)
				: `^${locate("vocabulary")}/src/(?!${rule.allowedSubjects.map((subject) => `${escapeExpression(subject)}(?:\\.ts|/)`).join("|")})`,
	},
});

export const compileBoundaryPolicy = (policy: readonly BoundaryRule[], inventory: BoundaryPolicyInventory) => {
	validatePolicyInventory(policy, inventory);
	const locate = locatePackage(inventory);
	const forbidden = policy.map((rule) => compileRule(rule, locate));
	validatePolicy(policy, forbidden, locate);
	return {
		configuration: {
			forbidden,
			options: {
				doNotFollow: { path: "node_modules" },
				enhancedResolveOptions: {
					conditionNames: ["import"],
					exportsFields: ["exports"],
				},
				exclude: { path: "(^|/)(dist|out|node_modules)(/|$)" },
				tsPreCompilationDeps: true,
			},
		},
		fixtures: policy.map(({ examples, name }) => ({
			illegal: examples.illegal,
			legal: examples.legal,
			rule: name,
		})) satisfies readonly BoundaryFixture[],
	};
};
