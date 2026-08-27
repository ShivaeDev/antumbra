import { Data, Effect } from "effect";
import { exceptionFailure, sanctionedOf } from "#boundaries/exceptions.ts";
import type {
	BoundaryRule,
	CompiledBoundaryRule,
	FixtureEdge,
} from "#boundaries/model.ts";

class BoundaryPolicyInvalid extends Data.TaggedError("BoundaryPolicyInvalid")<{
	readonly message: string;
}> {}

export const failPolicy = (message: string): never =>
	Effect.runSync(Effect.fail(new BoundaryPolicyInvalid({ message })));

const endpointPath = (endpoint: FixtureEdge["to"]) =>
	endpoint.kind === "workspace-file" ? endpoint.path : endpoint.name;

const matches = (rule: CompiledBoundaryRule, edge: FixtureEdge) =>
	new RegExp(rule.from.path).test(edge.from.path) &&
	new RegExp(rule.to.path).test(endpointPath(edge.to));

const describeEdge = (edge: FixtureEdge) =>
	`${edge.from.path} → ${endpointPath(edge.to)}`;

const validateExceptions = (
	rule: BoundaryRule,
	compiled: readonly CompiledBoundaryRule[],
) => {
	const compiledRule = compiled.find(({ name }) => name === rule.name);
	for (const exception of sanctionedOf(rule)) {
		const failure = exceptionFailure(rule, compiledRule, exception);
		if (failure !== undefined) {
			failPolicy(failure);
		}
	}
};

const validateNames = (policy: readonly BoundaryRule[]) => {
	const names = new Set<string>();
	for (const rule of policy) {
		if (names.has(rule.name)) {
			failPolicy(`Boundary rule name is duplicated: ${rule.name}`);
		}
		names.add(rule.name);
	}
};

const validateExamples = (
	rule: BoundaryRule,
	compiled: readonly CompiledBoundaryRule[],
) => {
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
};

export const validatePolicy = (
	policy: readonly BoundaryRule[],
	compiled: readonly CompiledBoundaryRule[],
) => {
	validateNames(policy);
	for (const rule of policy) {
		if (rule.rationale.trim().length === 0) {
			failPolicy(`Boundary rule has no rationale: ${rule.name}`);
		}
		validateExceptions(rule, compiled);
		validateExamples(rule, compiled);
	}
};
