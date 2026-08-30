import { describe, expect, it } from "vitest";
import { serviceParameterViolations } from "#lint/rules/service-parameters.ts";
import { inventoryOf, type SeedFile } from "#test/support/inventory.ts";

const source = (content: string, path: string): SeedFile => ({ content, path });

const check = (sources: readonly SeedFile[]) => serviceParameterViolations(inventoryOf({ sources }));

describe("Effect service parameter reciprocal symbol cases", () => {
	it("follows imported internal aliases of Effect service factories", () => {
		const violations = check([
			source(
				`import { Context } from "effect";
export const ServiceFactory = Context.Service;
export const { Service: DestructuredFactory } = Context;
`,
				"packages/pieces/src/factory.ts",
			),
			source(
				`import { DestructuredFactory, ServiceFactory } from "./factory.ts";
class Pieces extends ServiceFactory<Pieces, { readonly launch: () => void }>()("Pieces") {}
class Destructured extends DestructuredFactory<Destructured, { readonly launch: () => void }>()("Destructured") {}
const use = (pieces: Pieces) => pieces;
const useDestructured = (pieces: Destructured) => pieces;
`,
				"packages/pieces/src/use.ts",
			),
			source(
				`import * as Factories from "./factory.ts";
class NamespacePieces extends Factories.ServiceFactory<NamespacePieces, { readonly launch: () => void }>()("NamespacePieces") {}
const useNamespace = (pieces: NamespacePieces) => pieces;
`,
				"packages/pieces/src/use-namespace.ts",
			),
		]);
		expect(violations.map((violation) => violation.message)).toEqual([
			expect.stringContaining('"pieces" of "use"'),
			expect.stringContaining('"pieces" of "useDestructured"'),
			expect.stringContaining('"pieces" of "useNamespace"'),
		]);
	});

	it("classifies Contexts inside inline and named structural bundles", () => {
		const violations = check([
			source(
				`import type { Context } from "effect/Context";
export type Box<R> = { readonly runtime: Context<R> };
`,
				"packages/domain/src/box.ts",
			),
			source(
				`import type { Context } from "effect/Context";
import type { Box } from "./box.ts";
const inline = (box: { readonly runtime: Context<{ readonly token: string }> }) => box;
const empty = (box: Box<never>) => box;
const nonempty = (box: Box<{ readonly token: string }>) => box;
`,
				"packages/domain/src/use-box.ts",
			),
		]);
		expect(violations.map((violation) => violation.message)).toEqual([
			expect.stringContaining('"box" of "inline"'),
			expect.stringContaining('"box" of "nonempty"'),
		]);
	});

	it("preserves generic Context arguments through interface shapes", () => {
		const violations = check([
			source(
				`import { Context as EffectContext } from "effect";
import type { Context } from "effect/Context";
interface Runtime<R> extends Context<R> {}
interface QualifiedRuntime<R> extends EffectContext.Context<R> {}
interface Box<R> { readonly runtime: Context<R> }
interface Recursive<R> { readonly runtime: Context<R>; readonly next?: Recursive<R> }
const emptyRuntime = (runtime: Runtime<never>) => runtime;
const liveRuntime = (runtime: Runtime<{ readonly token: string }>) => runtime;
const emptyQualified = (runtime: QualifiedRuntime<never>) => runtime;
const liveQualified = (runtime: QualifiedRuntime<{ readonly token: string }>) => runtime;
const emptyBox = (box: Box<never>) => box;
const liveBox = (box: Box<{ readonly token: string }>) => box;
const emptyRecursive = (node: Recursive<never>) => node;
const liveRecursive = (node: Recursive<{ readonly token: string }>) => node;
`,
				"packages/domain/src/interface-context.ts",
			),
		]);
		expect(violations.map((violation) => violation.message)).toEqual([
			expect.stringContaining('"runtime" of "liveRuntime"'),
			expect.stringContaining('"runtime" of "liveQualified"'),
			expect.stringContaining('"box" of "liveBox"'),
			expect.stringContaining('"node" of "liveRecursive"'),
		]);
	});

	it("does not trust mutable Effect factory aliases", () => {
		expect(
			check([
				source(
					`import { Context } from "effect";
declare const Foreign: { readonly Service: <Self, Shape>() => (tag: string) => new () => Shape };
let Factory = Context.Service;
Factory = Foreign.Service;
class Fake extends Factory<Fake, { readonly read: () => void }>()("Fake") {}
const use = (fake: Fake) => fake;
`,
					"packages/domain/src/mutable-factory.ts",
				),
			]),
		).toEqual([]);
	});
});
