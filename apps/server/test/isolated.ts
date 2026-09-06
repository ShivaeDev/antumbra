import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Config, Effect } from "effect";
import { assert } from "vitest";

const INSTALLED = ["Antumbra", "Antumbra-Dev"];
const RUNNER = ["CI", "GITHUB_ACTIONS", "GITHUB_RUN_ID", "RUNNER_TEMP"];

const variable = (name: string): string => Effect.runSync(Config.string(name).pipe(Config.withDefault("")));

const refusal = (): string | undefined => {
	const beside = INSTALLED.filter((name) => existsSync(join(homedir(), "Library", "Application Support", name)));
	if (beside.length > 0) {
		return `This test spawns a real Antumbra server and runs only on a GitHub Actions runner; it refuses this machine, which holds ${beside.join(" and ")}.`;
	}
	const absent = RUNNER.filter((name) => variable(name) === "");
	return absent.length === 0
		? undefined
		: `This test spawns a real Antumbra server and runs only on a GitHub Actions runner; ${absent.join(", ")} ${absent.length === 1 ? "is" : "are"} not set.`;
};

export const isolatedTemp = (): string => {
	const refused = refusal();
	return refused === undefined ? variable("RUNNER_TEMP") : assert.fail(refused);
};
