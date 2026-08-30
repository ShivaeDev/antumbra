import { describe, expect, it } from "vitest";
import { serviceParameterViolations } from "#lint/rules/service-parameters.ts";
import { inventoryOf, type SeedFile } from "#test/support/inventory.ts";

const source = (content: string, path: string): SeedFile => ({ content, path });

const check = (sources: readonly SeedFile[]) => serviceParameterViolations(inventoryOf({ sources }));

describe("Effect service parameter symbol analysis", () => {
	it("follows generic constraints without confusing same-named symbols", () => {
		const violations = check([
			source("export interface AgentDeps { readonly db: DatabaseService }\n", "packages/domain/src/deps.ts"),
			source("interface AgentDeps { readonly label: string }\nconst safe = (deps: AgentDeps) => deps;\n", "packages/other/src/safe.ts"),
			source('import type { AgentDeps as Deps } from "./deps.ts";\nconst use = <T extends Deps>(deps: T) => deps;\n', "packages/domain/src/use.ts"),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.file).toBe("packages/domain/src/use.ts");
	});

	it("detects service factories and factory return types", () => {
		const violations = check([
			source(
				`import { Context } from "effect";
interface AgentDeps { readonly db: DatabaseService }
declare const makeDeps: () => AgentDeps;
declare const makeContext: () => Context.Context<{ readonly token: string }>;
const fromReturn = (deps: ReturnType<typeof makeDeps>) => deps;
const fromFactory = (factory: () => AgentDeps) => factory();
const fromContextFactory = (factory: typeof makeContext) => factory();
`,
				"packages/domain/src/factories.ts",
			),
		]);
		expect(violations.map((violation) => violation.message)).toEqual([
			expect.stringContaining('"deps" of "fromReturn"'),
			expect.stringContaining('"factory" of "fromFactory"'),
			expect.stringContaining('"factory" of "fromContextFactory"'),
		]);
	});

	it("detects generic and inferred destructured service bundles", () => {
		const violations = check([
			source(
				`interface AgentDeps { readonly db: DatabaseService }
declare const makeDeps: () => AgentDeps;
const generic = <T extends AgentDeps>({ db }: T) => db;
const inferred = ({ db } = makeDeps()) => db;
`,
				"packages/domain/src/destructuring.ts",
			),
		]);
		expect(violations).toHaveLength(2);
		expect(violations.map((violation) => violation.message)).toEqual([
			expect.stringContaining('"{ db }" of "generic"'),
			expect.stringContaining('"{ db }" of "inferred"'),
		]);
	});

	it("tracks aliased Contexts through generic constraints", () => {
		const violations = check([
			source(
				`import type { Context as RuntimeContext } from "effect/Context";
type DatabaseService = { readonly query: () => void };
type Runtime<R = never> = RuntimeContext<R>;
type EmptyRuntime = RuntimeContext<never & { readonly token: string }>;
type EmptyAlias = Runtime<never>;
declare const makeEmpty: () => EmptyRuntime;
declare const makeEmptyAlias: () => EmptyAlias;
declare const makeRuntime: () => RuntimeContext<{ readonly token: string }>;
const makeRuntimeAlias = makeRuntime;
const runtimeAlias = makeRuntimeAlias();
const use = <R extends DatabaseService>(services: Runtime<R>) => services;
const empty = (services: Runtime<never>) => services;
const emptyDefault = (services: Runtime) => services;
const emptyAlias = (services: EmptyRuntime) => services;
const inferredEmpty = (services = makeEmpty()) => services;
const inferredEmptyAlias = (services = makeEmptyAlias()) => services;
const inferredRuntime = (services = makeRuntime()) => services;
const inferredRuntimeAlias = (services = runtimeAlias) => services;
const runtimeFactory = (factory: typeof makeRuntimeAlias) => factory();
const renamed = (services: RuntimeContext<{ readonly token: string }>) => services;
`,
				"packages/domain/src/context.ts",
			),
		]);
		expect(violations.map((violation) => violation.message)).toEqual([
			expect.stringContaining('"services" of "use"'),
			expect.stringContaining('"services" of "inferredRuntime"'),
			expect.stringContaining('"services" of "inferredRuntimeAlias"'),
			expect.stringContaining('"factory" of "runtimeFactory"'),
			expect.stringContaining('"services" of "renamed"'),
		]);
	});

	it("does not treat an aliased Effect requirement as a service value", () => {
		expect(
			check([
				source(
					`import { Effect as ProgramType } from "effect";
type DatabaseService = { readonly query: () => void };
type Program<R> = ProgramType<void, never, R>;
type Handler = () => Program<DatabaseService>;
interface Options { readonly execute: () => Program<DatabaseService> }
const execute = (program: Program<DatabaseService>) => program;
const handle = (handler: Handler) => handler;
const define = (options: Options) => options;
`,
					"packages/domain/src/program.ts",
				),
			]),
		).toEqual([]);
	});

	it("resolves root package imports through script", () => {
		const violations = check([
			source("export interface Deps { readonly db: DatabaseService }\n", "script/deps.ts"),
			source('import type { Deps } from "#deps.ts";\nconst use = (deps: Deps) => deps;\n', "script/use.ts"),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.file).toBe("script/use.ts");
	});

	it("does not treat foreign Service factories as Effect services", () => {
		expect(
			check([
				source(
					`declare const Foreign: { readonly Service: <Self, Shape>() => (tag: string) => new () => Shape };
class Fake extends Foreign.Service<Fake, { readonly read: () => void }>()("Fake") {}
const use = (fake: Fake) => fake;
`,
					"packages/domain/src/foreign.ts",
				),
			]),
		).toEqual([]);
	});

	it("does not trust unrelated types that reuse Effect names", () => {
		const violations = check([
			source(
				`type DatabaseService = { readonly query: () => void };
interface Context<T> { readonly value: T }
interface Effect<T> { readonly value: T }
const safe = (context: Context<string>) => context;
const hidden = (program: Effect<DatabaseService>) => program;
`,
				"packages/domain/src/homonyms.ts",
			),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.message).toContain('"program" of "hidden"');
	});

	it("allows only the exact foreign callback composition seams", () => {
		const content = `type DatabaseService = { readonly query: () => void };
type AppRuntime = Context.Context<DatabaseService>;
`;
		const violations = check([
			source(`${content}const makeProcedure = (runtime: AppRuntime) => runtime;\n`, "packages/contract/src/router-procedure.ts"),
			source(`${content}const makeAppRouter = (runtime: AppRuntime) => runtime;\n`, "packages/contract/src/router.ts"),
			source(`${content}const makeHelper = (runtime: AppRuntime) => runtime;\n`, "packages/contract/src/router-helper.ts"),
		]);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.message).toContain('"runtime" of "makeHelper"');
		const nested = check([
			source(`${content}const makeAppRouter = () => (runtime: AppRuntime) => runtime;\n`, "packages/contract/src/router.ts"),
			source(
				`${content}declare const consume: (callback: (runtime: AppRuntime) => AppRuntime) => void;\nconst makeProcedure = () => consume((runtime: AppRuntime) => runtime);\n`,
				"packages/contract/src/router-procedure.ts",
			),
		]);
		expect(nested).toHaveLength(2);
	});
});
