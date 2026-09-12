import { describe, expect, it } from "vitest";
import { compileBoundaryPolicy } from "#boundaries/compiler.ts";
import { boundaryPolicyInventory, compiledBoundaryPolicy } from "#boundaries/config.ts";
import { anyOf, files, importFrom, packages, vocabularyAccess } from "#boundaries/dsl.ts";
import type { BoundaryRule, ImportSource } from "#boundaries/model.ts";

const vocabularyRule = vocabularyAccess("subject-inventory-under-test")
	.because("The compiler validates vocabulary subjects against the workspace inventory.")
	.for(packages.named("domain-pieces"))
	.allowsOnly("id")
	.demonstratedBy({
		illegal: importFrom(files.inPackage("server/domains/pieces", "src/ids.ts")).to(files.inPackage("platform/vocabulary", "src/board.ts")),
		legal: importFrom(files.inPackage("server/domains/pieces", "src/ids.ts")).to(files.inPackage("platform/vocabulary", "src/id.ts")),
	});

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

	it("takes a subject from a file stem or a directory name under src", () => {
		expect(boundaryPolicyInventory.vocabularySubjects).toContain("board");
		expect(boundaryPolicyInventory.vocabularySubjects).toContain("session-events");
	});

	it("rejects unknown vocabulary subjects", () => {
		expect(() => compileBoundaryPolicy([{ ...vocabularyRule, allowedSubjects: ["not-a-subject"] }], boundaryPolicyInventory)).toThrow(
			"names unknown vocabulary subject not-a-subject",
		);
	});
});
