import { describe, expect, it } from "vitest";
import { compileBoundaryPolicy } from "#boundaries/compiler.ts";
import { boundaryPolicyInventory, compiledBoundaryPolicy } from "#boundaries/config.ts";
import { anyOf, packages } from "#boundaries/dsl.ts";
import type { BoundaryRule, ImportSource } from "#boundaries/model.ts";
import { boundaryPolicy } from "#boundaries/policy.ts";
import { failPolicy } from "#boundaries/validation.ts";

const vocabularyRule =
	boundaryPolicy.find((rule): rule is Extract<BoundaryRule, { readonly kind: "vocabulary-access" }> => rule.kind === "vocabulary-access") ??
	failPolicy("Boundary policy has no vocabulary rule");

const withConsumers = (consumers: ImportSource): BoundaryRule => ({
	...vocabularyRule,
	consumers,
});

describe("boundary policy inventory", () => {
	it("configures dependency-cruiser to resolve package exports", () => {
		expect(compiledBoundaryPolicy.configuration.options.enhancedResolveOptions).toEqual({ conditionNames: ["import"], exportsFields: ["exports"] });
	});

	it("rejects unknown and empty authored workspace selectors", () => {
		expect(() => compileBoundaryPolicy([withConsumers(packages.named("not-a-package"))], boundaryPolicyInventory)).toThrow(
			"names unknown package not-a-package",
		);
		expect(() => compileBoundaryPolicy([withConsumers(packages.named())], boundaryPolicyInventory)).toThrow("names no package units");
		expect(() => compileBoundaryPolicy([withConsumers(anyOf())], boundaryPolicyInventory)).toThrow("has an empty category");
		expect(() => compileBoundaryPolicy([withConsumers(packages.inFamily("not-a-family"))], boundaryPolicyInventory)).toThrow(
			"family not-a-family matches no packages",
		);
	});

	it("rejects unknown vocabulary subjects", () => {
		expect(() => compileBoundaryPolicy([{ ...vocabularyRule, allowedSubjects: ["not-a-subject"] }], boundaryPolicyInventory)).toThrow(
			"names unknown vocabulary subject not-a-subject",
		);
	});
});
