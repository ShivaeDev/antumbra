import { describe, expect, it } from "vitest";
import { serviceDefinitionAssemblyViolations } from "#lint/rules/service-definition-assembly.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const violationsIn = (content: string, path = "packages/example/src/service.ts") =>
	serviceDefinitionAssemblyViolations(inventoryOf({ sources: [{ content, path }] }));

describe("service definition assembly rule", () => {
	it("allows a definition assembled from focused operation exports", () => {
		expect(
			violationsIn(`
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { initializeExample } from "#initialize.ts";
import { readExample } from "#read.ts";

export const Example = defineService({
	id: "@antumbra/example/Example",
	initialize: initializeExample,
	methods: () => ({ readExample }),
	requires: [],
});

export const Empty = defineService({
	id: "@antumbra/example/Empty",
	initialize: Effect.void,
	methods: () => ({}),
	requires: [],
});
`),
		).toEqual([]);
	});

	it("flags inline initializer and operation bodies", () => {
		const violations = violationsIn(`
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";

export const Example = defineService({
	id: "@antumbra/example/Example",
	initialize: Effect.gen(function* () { return 1; }),
	methods: () => ({
		read: Effect.fn("example.read")(function* () { return 1; }),
	}),
	requires: [],
});
`);
		expect(violations.map(({ line }) => line)).toEqual(expect.arrayContaining([7, 9]));
		expect(violations.every(({ rule }) => rule === "effect/service-definition-assembly")).toBe(true);
	});

	it("rejects non-generator inline bodies and Effect constructors", () => {
		const violations = violationsIn(`
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";

export const Example = defineService({
	id: "@antumbra/example/Example",
	initialize: Effect.sync(() => 1),
	methods: () => ({ read: () => Effect.succeed(1) }),
	requires: [],
});
`);
		expect(violations.map(({ line }) => line)).toEqual(expect.arrayContaining([7, 8]));
	});

	it("rejects a function expression in place of the canonical methods arrow", () => {
		const violations = violationsIn(`
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { read } from "#read.ts";
export const Example = defineService({
	id: "@antumbra/example/Example",
	initialize: Effect.void,
	methods: function () { return { read }; },
	requires: [],
});
`);
		expect(violations).toContainEqual(
			expect.objectContaining({
				line: 8,
				message: "Keep methods as a direct operation inventory.",
			}),
		);
	});

	it("rejects hoisting a body or aliasing the constructor", () => {
		const violations = violationsIn(`
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect as Fx } from "effect";

const read = Fx.fn("example.read")(function* () { return 1; });
const define = defineService;

export const Example = define({
	id: "@antumbra/example/Example",
	initialize: Fx.void,
	methods: () => ({ read }),
	requires: [],
});
`);
		expect(violations.map(({ line }) => line)).toEqual(expect.arrayContaining([2, 5]));
	});

	it("supports renamed imports and rejects namespace imports", () => {
		expect(
			violationsIn(`
import { defineService as define } from "@antumbra/service-definition/define-service.ts";
import { Effect as Fx } from "effect";
export const Example = define({
	id: "@antumbra/example/Example",
	initialize: Fx.void,
	methods: () => ({}),
	requires: [],
});
`),
		).toEqual([]);
		expect(
			violationsIn(`
import * as Services from "@antumbra/service-definition/define-service.ts";
export const Example = Services.defineService({});
`),
		).toHaveLength(1);
	});

	it("rejects an aliased definition that embeds another body", () => {
		const violations = violationsIn(`
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
export const Direct = defineService({
	id: "@antumbra/example/Direct",
	initialize: Effect.void,
	methods: () => ({}),
	requires: [],
});
const define = defineService;
export const Hidden = define({
	id: "@antumbra/example/Hidden",
	initialize: Effect.void,
	methods: () => ({}),
	requires: [],
});
`);
		expect(violations).toMatchObject([{ line: 14 }]);
	});

	it("rejects computed configuration members and spreads", () => {
		const violations = violationsIn(`
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
import { initialize, methods, read, shared } from "#operations.ts";
export const Computed = defineService({
	id: "@antumbra/example/Computed",
	["initialize"]: initialize,
	["methods"]: methods,
	requires: [],
});
export const Spread = defineService({
	...shared,
	id: "@antumbra/example/Spread",
	initialize: Effect.void,
	methods: () => ({ read }),
	requires: [],
});
`);
		const lines = violations.map(({ line }) => line);
		expect(lines).toEqual(expect.arrayContaining([7, 8, 12]));
	});

	it("does not mistake a shadowed name for the imported constructor", () => {
		const violations = violationsIn(`
import { defineService } from "@antumbra/service-definition/define-service.ts";
import { Effect } from "effect";
const inspect = (defineService: (value: unknown) => unknown) => defineService({});
export const Example = defineService({
	id: "@antumbra/example/Example",
	initialize: Effect.void,
	methods: () => ({}),
	requires: [],
});
`);
		expect(violations).toMatchObject([{ line: 4 }]);
	});

	it("does not govern tests or unrelated Effect modules", () => {
		const content = `
import { defineService } from "another-package";
import { Effect } from "effect";
const operation = Effect.gen(function* () { return 1; });
defineService({ operation });
`;
		expect(violationsIn(content)).toEqual([]);
		expect(violationsIn(content, "packages/example/test/service.test.ts")).toEqual([]);
	});
});
