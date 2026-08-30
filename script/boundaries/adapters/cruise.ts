import { realpathSync } from "node:fs";
import { registerHooks } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Schema } from "effect";

const CruiseReport = Schema.Struct({
	modules: Schema.Array(
		Schema.Struct({
			dependencies: Schema.Array(
				Schema.Struct({
					couldNotResolve: Schema.optional(Schema.Boolean),
					module: Schema.String,
					resolved: Schema.String,
				}),
			),
			source: Schema.String,
		}),
	),
	summary: Schema.Struct({
		error: Schema.Number,
		totalCruised: Schema.Number,
		totalDependenciesCruised: Schema.Number,
		violations: Schema.Array(
			Schema.Struct({
				from: Schema.String,
				rule: Schema.Struct({ name: Schema.String }),
				to: Schema.String,
			}),
		),
	}),
});

interface CruiseBoundaryOptions {
	readonly analysisRoot: string;
	readonly repositoryRoot: string;
	readonly sourceRoots: readonly string[];
}

export const cruiseBoundaries = async ({ analysisRoot, repositoryRoot, sourceRoots }: CruiseBoundaryOptions) => {
	const compilerRoot = realpathSync(join(repositoryRoot, "node_modules/typescript"));
	registerHooks({
		resolve(specifier, context, nextResolve) {
			if (specifier === "typescript") {
				return {
					shortCircuit: true,
					url: pathToFileURL(join(compilerRoot, "lib/typescript.js")).href,
				};
			}
			if (specifier === "typescript/package.json") {
				return {
					shortCircuit: true,
					url: pathToFileURL(join(compilerRoot, "package.json")).href,
				};
			}
			return nextResolve(specifier, context);
		},
	});
	const [{ cruise }, { default: extractOptions }] = await Promise.all([
		import("dependency-cruiser"),
		import("dependency-cruiser/config-utl/extract-depcruise-options"),
	]);
	const options = await extractOptions(join(repositoryRoot, ".dependency-cruiser.mjs"));
	options.outputType = "json";
	options.baseDir = analysisRoot;
	const cruiseResult = await cruise([...sourceRoots], options);
	const report = Schema.decodeUnknownSync(CruiseReport)(
		typeof cruiseResult.output === "string" ? JSON.parse(cruiseResult.output) : cruiseResult.output,
	);
	return {
		dependencyEvidence: report.modules.flatMap(({ dependencies, source }) =>
			dependencies.map((dependency) => ({
				couldNotResolve: dependency.couldNotResolve === true,
				from: source,
				resolved: dependency.resolved,
				specifier: dependency.module,
			})),
		),
		modules: report.modules.map(({ source }) => source),
		totalCruised: report.summary.totalCruised,
		totalDependenciesCruised: report.summary.totalDependenciesCruised,
		violations: report.summary.violations.map(({ from, rule, to }) => ({
			from,
			rule: rule.name,
			to,
		})),
	};
};
