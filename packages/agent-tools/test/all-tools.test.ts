import type { ToolDefinition } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { allToolSpecs } from "#all-tools.ts";
import * as agentTools from "#index.ts";

const isSpec = (value: unknown): value is ToolDefinition =>
	typeof value === "object" && value !== null && "description" in value && "inputSchema" in value && "name" in value;

const defined = Object.values(agentTools).filter(isSpec);

it("holds every tool the package defines", () => {
	expect(new Set(allToolSpecs)).toEqual(new Set(defined));
	expect(allToolSpecs).toHaveLength(defined.length);
});

it("names each tool once, so one description and one schema answer for it", () => {
	expect(new Set(allToolSpecs.map((spec) => spec.name)).size).toBe(allToolSpecs.length);
});
