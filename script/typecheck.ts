import { globSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Console, Data, Effect, Schema } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { typecheckGroups } from "#typecheck/groups.ts";

class TypecheckPlanError extends Data.TaggedError("TypecheckPlanError")<{
	readonly cause: unknown;
}> {}

const Locations = Schema.Array(Schema.Struct({ name: Schema.String, path: Schema.String }));
const Manifest = Schema.Struct({
	scripts: Schema.optional(Schema.Record(Schema.String, Schema.String)),
	dependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
	devDependencies: Schema.optional(Schema.Record(Schema.String, Schema.String)),
});

const program = Effect.gen(function* () {
	const [shard, count] = (process.argv[2] ?? "").split("/").map(Number);
	if (shard === undefined || count === undefined || !Number.isInteger(shard) || !Number.isInteger(count) || shard < 1 || shard > count) {
		return yield* Effect.fail(new TypecheckPlanError({ cause: "usage: pnpm typecheck:shard <index>/<count>" }));
	}
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	const raw = yield* spawner.string(ChildProcess.make("pnpm", ["list", "--recursive", "--depth", "-1", "--json"]));
	const groups = yield* Effect.try({
		try: () => {
			const locations = Schema.decodeUnknownSync(Locations)(JSON.parse(raw));
			const packages = locations
				.filter((pkg) => resolve(pkg.path) !== process.cwd())
				.map(({ name, path }) => {
					const manifest = Schema.decodeUnknownSync(Manifest)(JSON.parse(readFileSync(join(path, "package.json"), "utf8")));
					const files = globSync("{src,test,script}/**/*.{ts,tsx,mts,cts}", { cwd: path });
					return {
						name,
						bytes: files.reduce((bytes, file) => bytes + statSync(join(path, file)).size, 0),
						dependencies: Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).toSorted(),
						checks: manifest.scripts?.typecheck !== undefined,
					};
				});
			return typecheckGroups(packages, count);
		},
		catch: (cause) => new TypecheckPlanError({ cause }),
	});
	const names = groups[shard - 1] ?? [];
	yield* Console.log(`Typecheck ${shard}/${count}: ${names.join(", ")}`);
	if (names.length === 0) return;
	process.exitCode = yield* spawner.exitCode(
		ChildProcess.make("pnpm", [...names.flatMap((name) => ["--filter", name]), "--recursive", "--no-sort", "--if-present", "typecheck"], {
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		}),
	);
});

NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)));
