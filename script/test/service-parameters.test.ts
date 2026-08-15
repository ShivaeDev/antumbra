import { describe, expect, it } from "vitest";
import { serviceParameterViolations } from "#lint/rules/service-parameters.ts";
import { inventoryOf, type SeedFile } from "#test/support/inventory.ts";

interface Entry {
	readonly callable: string;
	readonly file: string;
	readonly parameter: string;
	readonly type: string;
}

const source = (
	content: string,
	path = "packages/domain/src/example.ts",
): SeedFile => ({ content, path });

const check = (
	sources: readonly SeedFile[],
	baseline: readonly Entry[] = [],
	allowance: readonly Entry[] = baseline,
) =>
	serviceParameterViolations(
		inventoryOf({
			serviceParameterAllowance: JSON.stringify(allowance),
			serviceParameterBaseline: JSON.stringify(baseline),
			sources,
		}),
	);

const entry = (
	callable: string,
	parameter: string,
	type: string,
	file = "packages/domain/src/example.ts",
): Entry => ({ callable, file, parameter, type });

describe("Effect service parameter debt ratchet", () => {
	it("detects direct services, contexts, and transitively tainted bundles", () => {
		const violations = check([
			source(`
type DatabaseService = { readonly query: () => void };
type WriteExecutors = { readonly transaction: true };
interface AgentDeps { readonly db: DatabaseService }
interface NestedDeps { readonly agent: AgentDeps }
const direct = (db: DatabaseService) => db;
const context = (services: Context.Context<WriteExecutors>) => services;
const nested = (deps: NestedDeps) => deps;
`),
		]);
		expect(violations.map((violation) => violation.message)).toEqual([
			expect.stringContaining('"db" of "direct"'),
			expect.stringContaining('"services" of "context"'),
			expect.stringContaining('"deps" of "nested"'),
		]);
	});

	it("follows imported aliases of a tainted bundle", () => {
		const violations = check([
			source(
				"interface AgentDeps { readonly db: DatabaseService }\n",
				"packages/domain/src/deps.ts",
			),
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
class Pieces extends Context.Service<Pieces, { readonly launch: () => void }>()("Pieces") {}
type PiecesService = Context.Service.Shape<typeof Pieces>;
const use = (pieces: PiecesService) => pieces;
`),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.message).toContain('"PiecesService"');
	});

	it("detects Writer-shaped, sink, sweep, and dispatch bundles", () => {
		const violations = check([
			source(`
type DatabaseService = { readonly query: () => void };
type WriteExecutors = { readonly transaction: true };
interface SweepWriter {
  readonly write: <A>(program: Effect.Effect<A, never, WriteExecutors>) => Effect.Effect<A>;
}
interface SinkContext { readonly writer: SweepWriter }
interface DispatchPort { readonly db: DatabaseService }
const sweep = (writer: SweepWriter) => writer;
const sink = (context: SinkContext) => context;
const dispatch = (port: DispatchPort) => port;
`),
		]);
		expect(violations).toHaveLength(3);
		expect(violations.map((violation) => violation.message)).toEqual([
			expect.stringContaining('"SweepWriter"'),
			expect.stringContaining('"SinkContext"'),
			expect.stringContaining('"DispatchPort"'),
		]);
	});

	it("does not mistake an Effect requirement for a manually passed service", () => {
		expect(
			check([
				source(`
type WriteExecutors = { readonly transaction: true };
const program = (effect: Effect.Effect<void, never, WriteExecutors>) => effect;
interface IntentOptions {
  readonly execute: () => Effect.Effect<void, never, WriteExecutors>;
}
const define = (options: IntentOptions) => options;
`),
			]),
		).toEqual([]);
	});

	it("checks the baseline in both directions", () => {
		const file = source("const use = (db: DatabaseService) => db;\n");
		const debt = entry("use", "db", "DatabaseService");
		expect(check([file], [debt])).toEqual([]);
		expect(check([file])[0]?.rule).toBe("effect/service-parameter-debt");
		const stale = check([], [debt]);
		expect(stale[0]?.rule).toBe("effect/service-parameter-baseline");
		expect(stale[0]?.message).toContain("only shrinks");
	});

	it("keys returned closures by their enclosing declaration", () => {
		const file = source(`
const build = Effect.gen(function* () {
  return (db: DatabaseService) => db;
});
`);
		expect(check([file], [entry("build", "db", "DatabaseService")])).toEqual(
			[],
		);
	});

	it("does not let one package's entry admit the same debt in another", () => {
		const debt = entry(
			"use",
			"db",
			"DatabaseService",
			"packages/domain/src/old-use.ts",
		);
		const violations = check(
			[
				source(
					"const use = (db: DatabaseService) => db;\n",
					"packages/domain/src/old-use.ts",
				),
				source(
					"const use = (db: DatabaseService) => db;\n",
					"packages/new/src/use.ts",
				),
			],
			[debt],
		);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.file).toBe("packages/new/src/use.ts");
	});

	it("rejects baseline allowance for a new package", () => {
		const violations = check(
			[
				source(
					"const use = (db: DatabaseService) => db;\n",
					"packages/new/src/use.ts",
				),
			],
			[entry("use", "db", "DatabaseService", "packages/new/src/use.ts")],
		);
		expect(violations[0]?.rule).toBe("effect/service-parameter-baseline");
		expect(violations[0]?.message).toContain(
			"New packages have zero allowance",
		);
	});

	it("rejects a newly baselined entry inside the legacy domain root", () => {
		const debt = entry("use", "db", "DatabaseService");
		const violations = check(
			[source("const use = (db: DatabaseService) => db;\n")],
			[debt],
			[],
		);
		expect(violations[0]?.rule).toBe("effect/service-parameter-baseline");
		expect(violations[0]?.message).toContain("frozen legacy allowance");
	});

	it("exempts only tests, source adapters, and the desktop composition root", () => {
		const content = "const use = (db: DatabaseService) => db;\n";
		const violations = check([
			source(content, "packages/x/test/use.ts"),
			source(content, "packages/x/src/adapters/use.ts"),
			source(content, "apps/desktop/src/main.ts"),
			source(content, "apps/desktop/src/main-helper.ts"),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.file).toBe("apps/desktop/src/main-helper.ts");
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

	it("rejects a malformed baseline", () => {
		const violations = serviceParameterViolations(
			inventoryOf({
				serviceParameterBaseline: '{"file":"not-an-array"}',
			}),
		);
		expect(violations[0]?.rule).toBe("effect/service-parameter-baseline");
	});
});
