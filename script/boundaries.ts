import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeRuntime } from "@effect/platform-node";
import { Cause, Console, Effect } from "effect";
import { cruiseBoundaries } from "#boundaries/adapters/cruise.ts";
import { boundaryInventoryFailures, expectedBoundarySources } from "#boundaries/inventory.ts";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(scriptDirectory);
const analysisRoot = resolve(process.argv[2] ?? repositoryRoot);
const sourceRoots = ["apps", "packages"].filter((sourceRoot) => existsSync(join(analysisRoot, sourceRoot)));

const program = Effect.tryPromise({
	catch: (cause) => (cause instanceof Error ? cause : new Error("Boundary analysis failed")),
	try: () => cruiseBoundaries({ analysisRoot, repositoryRoot, sourceRoots }),
}).pipe(
	Effect.flatMap((report) => {
		const failures = boundaryInventoryFailures(
			{
				dependencies: report.totalDependenciesCruised,
				dependencyEvidence: report.dependencyEvidence,
				modules: report.modules,
			},
			expectedBoundarySources(analysisRoot, sourceRoots),
		);
		const violations = report.violations.map(({ from, rule, to }) => `${rule}: ${from} → ${to}`);
		const failed = failures.length > 0 || violations.length > 0;
		const summary = failed
			? [...violations, ...failures].join("\n")
			: `✔ no dependency violations found (${report.totalCruised} modules, ${report.totalDependenciesCruised} dependencies cruised)`;
		return Console[failed ? "error" : "log"](summary).pipe(
			Effect.tap(() =>
				Effect.sync(() => {
					process.exitCode = failed ? 1 : 0;
				}),
			),
		);
	}),
	Effect.catchCause((cause) =>
		Console.error(Cause.pretty(cause)).pipe(
			Effect.tap(() =>
				Effect.sync(() => {
					process.exitCode = 1;
				}),
			),
		),
	),
);

NodeRuntime.runMain(program, { disableErrorReporting: true });
