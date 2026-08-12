import process from "node:process";
import { Effect } from "effect";
import { report } from "#lint/adapters/report.ts";
import { runMain } from "#lint/adapters/run.ts";
import { collectInventory } from "#lint/inventory.ts";
import { lint } from "#lint/program.ts";

const program = Effect.gen(function* () {
	const inventory = yield* collectInventory(process.argv[2] ?? process.cwd());
	const violations = yield* lint(inventory);
	yield* report(inventory, violations);
});

runMain(program);
