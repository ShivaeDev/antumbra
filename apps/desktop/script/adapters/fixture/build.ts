import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Schema } from "effect";
import { build } from "rolldown";

export const fixtureBundle = async (directory: string) => {
	const output = join(directory, ".build", "server.mjs");
	await mkdir(dirname(output), { recursive: true });
	return {
		input: fileURLToPath(import.meta.resolve("@antumbra/server/fixture-main.ts")),
		external: ["sharp"],
		platform: "node" as const,
		output: { codeSplitting: false, file: output, format: "esm" as const, paths: { sharp: fileURLToPath(import.meta.resolve("sharp")) } },
	};
};

export const checkFixtureServer = async (directory: string) => {
	const bundle = await fixtureBundle(directory);
	await build(bundle);
	const output = bundle.output.file;
	const child = spawn(process.execPath, [output, "--check", "--data", join(directory, "server"), "--files", directory, "--logs", directory], {
		stdio: "inherit",
		env: { ANTUMBRA_TOKEN: crypto.randomUUID() },
	});
	const stop = () => {
		child.kill("SIGTERM");
	};
	process.once("SIGTERM", stop);
	try {
		const [code] = await once(child, "exit");
		process.exitCode = Schema.decodeUnknownSync(Schema.Int)(code ?? 1);
	} finally {
		process.removeListener("SIGTERM", stop);
	}
};
