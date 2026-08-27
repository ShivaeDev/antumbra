import { describeException, sanctionedOf } from "#boundaries/exceptions.ts";
import { compileSelector, escapeExpression } from "#boundaries/expressions.ts";
import type {
	BoundaryFixture,
	BoundaryPolicyInventory,
	BoundaryRule,
	CompiledBoundaryRule,
} from "#boundaries/model.ts";
import { validatePolicyInventory } from "#boundaries/policy-inventory.ts";
import { validatePolicy } from "#boundaries/validation.ts";

const compileRule = (rule: BoundaryRule): CompiledBoundaryRule => ({
	comment: `${rule.rationale}${sanctionedOf(rule).map(describeException).join("")}`,
	from: {
		path: compileSelector(
			rule.kind === "negative-fence" ? rule.from : rule.consumers,
		),
	},
	name: rule.name,
	severity: "error",
	to: {
		path:
			rule.kind === "negative-fence"
				? compileSelector(rule.to)
				: `^packages/vocabulary/src/(?!${rule.allowedSubjects
						.map((subject) => `${escapeExpression(subject)}(?:\\.ts|/)`)
						.join("|")})`,
	},
});

export const compileBoundaryPolicy = (
	policy: readonly BoundaryRule[],
	inventory: BoundaryPolicyInventory,
) => {
	validatePolicyInventory(policy, inventory);
	const forbidden = policy.map(compileRule);
	validatePolicy(policy, forbidden);
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
