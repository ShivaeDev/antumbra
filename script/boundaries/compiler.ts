import { Data, Effect } from "effect";
import type {
	BoundaryRule,
	FixtureEdge,
	ImportSource,
	ImportTarget,
} from "#boundaries/model.ts";

export interface CompiledBoundaryRule {
	readonly comment: string;
	readonly from: { readonly path: string };
	readonly name: string;
	readonly severity: "error";
	readonly to: { readonly path: string };
}

export interface BoundaryFixture {
	readonly illegal: FixtureEdge;
	readonly legal: FixtureEdge;
	readonly rule: string;
}

class BoundaryPolicyInvalid extends Data.TaggedError("BoundaryPolicyInvalid")<{
	readonly message: string;
}> {}

const failPolicy = (message: string): never =>
	Effect.runSync(Effect.fail(new BoundaryPolicyInvalid({ message })));

const escapeExpression = (value: string) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const alternatives = (values: readonly string[]) =>
	values.map(escapeExpression).join("|");

const compileSelector = (selector: ImportSource | ImportTarget): string => {
	switch (selector.kind) {
		case "all-applications":
			return "^apps/";
		case "all-packages":
			return "^packages/";
		case "any":
			return selector.selectors
				.map((member) => `(?:${compileSelector(member)})`)
				.join("|");
		case "application":
			return `^apps/(${alternatives(selector.names)})(?:/|$)`;
		case "package":
			return `^packages/(${alternatives(selector.names)})(?:/|$)`;
		case "external-module":
			return selector.name.startsWith("node:")
				? `^${escapeExpression(selector.name)}$`
				: `(^|/)${escapeExpression(selector.name)}(?:/|$)`;
		case "external-namespace":
			return `(^|/)${escapeExpression(selector.name)}(?:/|$)`;
		case "package-family":
			return `^packages/${escapeExpression(selector.family)}-[^/]+(?:/|$)`;
		case "workspace-except":
			return `^packages/(?!${selector.excludedPackages
				.map((name) => `${escapeExpression(name)}(?:/|$)`)
				.join("|")})|^apps/`;
	}
};

const compileRule = (rule: BoundaryRule): CompiledBoundaryRule => ({
	comment: rule.rationale,
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

const endpointPath = (endpoint: FixtureEdge["to"]) =>
	endpoint.kind === "workspace-file" ? endpoint.path : endpoint.name;

const matches = (rule: CompiledBoundaryRule, edge: FixtureEdge) =>
	new RegExp(rule.from.path).test(edge.from.path) &&
	new RegExp(rule.to.path).test(endpointPath(edge.to));

const describeEdge = (edge: FixtureEdge) =>
	`${edge.from.path} → ${endpointPath(edge.to)}`;

const validatePolicy = (
	policy: readonly BoundaryRule[],
	compiled: readonly CompiledBoundaryRule[],
) => {
	const names = new Set<string>();
	for (const rule of policy) {
		if (names.has(rule.name)) {
			failPolicy(`Boundary rule name is duplicated: ${rule.name}`);
		}
		names.add(rule.name);
	}
	for (const rule of policy) {
		if (rule.rationale.trim().length === 0) {
			failPolicy(`Boundary rule has no rationale: ${rule.name}`);
		}
		const illegalMatches = compiled
			.filter((candidate) => matches(candidate, rule.examples.illegal))
			.map(({ name }) => name);
		if (illegalMatches.length !== 1 || illegalMatches[0] !== rule.name) {
			failPolicy(
				`Illegal example for ${rule.name} must violate only that rule: ${describeEdge(rule.examples.illegal)} violated ${illegalMatches.join(", ") || "none"}`,
			);
		}
		const legalMatches = compiled
			.filter((candidate) => matches(candidate, rule.examples.legal))
			.map(({ name }) => name);
		if (legalMatches.length > 0) {
			failPolicy(
				`Legal example for ${rule.name} must pass every rule: ${describeEdge(rule.examples.legal)} violated ${legalMatches.join(", ")}`,
			);
		}
	}
};

export const compileBoundaryPolicy = (policy: readonly BoundaryRule[]) => {
	const forbidden = policy.map(compileRule);
	validatePolicy(policy, forbidden);
	return {
		configuration: {
			forbidden,
			options: {
				doNotFollow: { path: "node_modules" },
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
