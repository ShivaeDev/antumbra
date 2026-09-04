import { describe, expect, it } from "vitest";
import { serviceParameterViolations } from "#lint/rules/service-parameters.ts";
import { inventoryOf, type SeedFile } from "#test/support/inventory.ts";

const source = (content: string, path = "packages/domain/src/example.ts"): SeedFile => ({ content, path });

const check = (sources: readonly SeedFile[]) => serviceParameterViolations(inventoryOf({ sources }));

describe("Effect service parameter debt", () => {
	it("detects direct services, contexts, and transitively tainted bundles", () => {
		const violations = check([
			source(`
type DatabaseService = { readonly query: () => void };
interface AgentDeps { readonly db: DatabaseService }
interface NestedDeps { readonly agent: AgentDeps }
const direct = (db: DatabaseService) => db;
const context = (services: Context.Context<DatabaseService>) => services;
const nested = (deps: NestedDeps) => deps;
`),
		]);
		expect(violations.map((violation) => violation.rule)).toEqual(Array(3).fill("effect/service-parameter-debt"));
		expect(violations.map((violation) => violation.message)).toEqual([
			expect.stringContaining('"db" of "direct"'),
			expect.stringContaining('"services" of "context"'),
			expect.stringContaining('"deps" of "nested"'),
		]);
	});

	it("follows imported aliases of a tainted bundle", () => {
		const violations = check([
			source("export interface AgentDeps { readonly db: DatabaseService }\n", "packages/domain/src/deps.ts"),
			source(`
import type { AgentDeps as Deps } from "./deps.ts";
const use = (deps: Deps) => deps;
`),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.message).toContain('"Deps"');
	});

	it("detects a service shape extracted through typeof", () => {
		const violations = check([
			source(`
import { Context } from "effect";
import { Service as DirectFactory } from "effect/Context";
const { Service: ServiceFactory } = Context;
class Pieces extends ServiceFactory<Pieces, { readonly launch: () => void }>()("Pieces") {}
class Direct extends DirectFactory<Direct, { readonly launch: () => void }>()("Direct") {}
type PiecesService = Context.Service.Shape<typeof Pieces>;
const use = (pieces: PiecesService) => pieces;
const useDirect = (direct: Direct) => direct;
`),
		]);
		expect(violations).toHaveLength(2);
		expect(violations.map((violation) => violation.message)).toEqual([
			expect.stringContaining('"PiecesService"'),
			expect.stringContaining('"Direct"'),
		]);
	});

	it("rejects relaying a runner registry once the registry is a service", () => {
		const violations = check([
			source(`
import { Context } from "effect";
interface Runner { readonly reclaim: () => Effect.Effect<void> }
class ResourceReclaimRunners extends Context.Service<
  ResourceReclaimRunners,
  ReadonlyMap<string, Runner>
>()("ResourceReclaimRunners") {}
type Runners = Context.Service.Shape<typeof ResourceReclaimRunners>;
const relay = (runners: Runners) => runners;
`),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.message).toContain('"runners" of "relay"');
	});

	it("detects nested database service bundles", () => {
		const violations = check([
			source(`
type DatabaseService = { readonly query: () => void };
interface QueryPort { readonly db: DatabaseService }
interface SinkContext { readonly queries: QueryPort }
interface DispatchPort { readonly db: DatabaseService }
const query = (port: QueryPort) => port;
const sink = (context: SinkContext) => context;
const dispatch = (port: DispatchPort) => port;
`),
		]);
		expect(violations).toHaveLength(3);
		expect(violations.map((violation) => violation.message)).toEqual([
			expect.stringContaining('"QueryPort"'),
			expect.stringContaining('"SinkContext"'),
			expect.stringContaining('"DispatchPort"'),
		]);
	});

	it("does not mistake an Effect requirement for a manually passed service", () => {
		expect(
			check([
				source(`
import { Effect } from "effect";
type DatabaseService = { readonly query: () => void };
const program = (effect: Effect.Effect<void, never, DatabaseService>) => effect;
interface IntentOptions {
  readonly execute: () => Effect.Effect<void, never, DatabaseService>;
}
const define = (options: IntentOptions) => options;
`),
			]),
		).toEqual([]);
	});

	it("names returned closures by their enclosing declaration", () => {
		const violations = check([
			source(`
const build = Effect.gen(function* () {
  return (db: DatabaseService) => db;
});
`),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.message).toContain('"db" of "build"');
	});

	it("exempts only tests and the desktop composition root", () => {
		const content = "const use = (db: DatabaseService) => db;\n";
		const violations = check([
			source(content, "packages/x/test/use.ts"),
			source(content, "packages/x/src/adapters/use.ts"),
			source(content, "apps/desktop/src/main.ts"),
			source(content, "apps/desktop/src/main-helper.ts"),
		]);
		expect(violations.map((violation) => violation.file)).toEqual(["packages/x/src/adapters/use.ts", "apps/desktop/src/main-helper.ts"]);
	});

	it("ignores parameter declarations without runtime implementations", () => {
		expect(
			check([
				source(`
interface Port { readonly use: (db: DatabaseService) => void }
type Use = (db: DatabaseService) => void;
`),
			]),
		).toEqual([]);
	});
});
