import { Console, Data, Effect, Runtime } from "effect";
import type { Inventory } from "#lint/inventory.ts";
import { byLocation, type Violation } from "#lint/violation.ts";

const locate = (violation: Violation): string => (violation.line === undefined ? violation.file : `${violation.file}:${violation.line}`);

export const report = (inventory: Inventory, violations: readonly Violation[]): Effect.Effect<void, LintFailed> =>
	Effect.gen(function* () {
		if (violations.length === 0) {
			yield* Console.log(`Lint passed (${inventory.sources.length} source file(s), ${inventory.manifests.length} manifest(s)).`);
			return;
		}
		const details = [...violations]
			.sort(byLocation)
			.map((violation) => `  ${locate(violation)} [${violation.rule}]\n    ${violation.message}`)
			.join("\n\n");
		yield* Console.error(`Lint failed:\n\n${details}\n\n${violations.length} violation(s).`);
		return yield* Effect.fail(new LintFailed());
	});

class LintFailed extends Data.TaggedError("LintFailed") {
	override readonly [Runtime.errorReported] = false;
}
