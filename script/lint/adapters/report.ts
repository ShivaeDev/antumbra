import process from "node:process";
import { Effect } from "effect";
import type { Inventory } from "#lint/inventory.ts";
import { byLocation, type Violation } from "#lint/violation.ts";

const locate = (violation: Violation): string =>
	violation.line === undefined
		? violation.file
		: `${violation.file}:${violation.line}`;

export const report = (
	inventory: Inventory,
	violations: readonly Violation[],
): Effect.Effect<void> =>
	Effect.sync(() => {
		if (violations.length === 0) {
			process.stdout.write(
				`Lint passed (${inventory.sources.length} source file(s), ${inventory.manifests.length} manifest(s)).\n`,
			);
			return;
		}
		process.stderr.write("Lint failed:\n\n");
		for (const violation of [...violations].sort(byLocation)) {
			process.stderr.write(
				`  ${locate(violation)} [${violation.rule}]\n    ${violation.message}\n\n`,
			);
		}
		process.stderr.write(`${violations.length} violation(s).\n`);
		process.exitCode = 1;
	});
