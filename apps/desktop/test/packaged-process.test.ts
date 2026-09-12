import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "@effect/vitest";
import { createPackage } from "@electron/asar";
import { Effect } from "effect";
import { packagedChildBundle } from "#adapters/bundle-paths.ts";

const electronRoot = dirname(fileURLToPath(import.meta.resolve("electron/package.json")));
const electron = join(electronRoot, "dist", readFileSync(join(electronRoot, "path.txt"), "utf8").trim());
const temporary = Effect.acquireRelease(
	Effect.sync(() => mkdtempSync(join(tmpdir(), "antumbra-packaged-process-"))),
	(path) => Effect.sync(() => rmSync(path, { recursive: true, force: true })),
);
const prepare = (root: string) => {
	const source = join(root, "app");
	mkdirSync(join(source, "out"), { recursive: true });
	writeFileSync(join(source, "package.json"), JSON.stringify({ type: "module" }));
	for (const name of ["@anthropic-ai/claude-agent-sdk", "@earendil-works/pi-coding-agent", "sharp"]) {
		const directory = join(source, "node_modules", name);
		mkdirSync(directory, { recursive: true });
		writeFileSync(join(directory, "package.json"), JSON.stringify({ name, type: "module", exports: "./index.js" }));
		writeFileSync(
			join(directory, "index.js"),
			'import {readFileSync} from "node:fs"; export default JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).name;',
		);
	}
	writeFileSync(
		join(source, "out", "runner.js"),
		'import claude from "@anthropic-ai/claude-agent-sdk"; import pi from "@earendil-works/pi-coding-agent"; console.log(JSON.stringify([claude,pi]));',
	);
	writeFileSync(join(source, "out", "server.js"), 'import sharp from "sharp"; console.log(sharp);');
	return source;
};

it.live("packaged child bundles resolve SDKs and Sharp beside the app archive", () =>
	Effect.gen(function* () {
		const root = yield* temporary;
		const source = yield* Effect.sync(() => prepare(root));
		const archive = join(root, "app.asar");
		yield* Effect.promise(() => createPackage(source, archive));
		const output = (child: "runner" | "server") =>
			execFileSync(electron, [packagedChildBundle(archive, child)], {
				encoding: "utf8",
				env: { ELECTRON_RUN_AS_NODE: "1" },
			});
		expect(yield* Effect.sync(() => output("runner"))).toBe('["@anthropic-ai/claude-agent-sdk","@earendil-works/pi-coding-agent"]\n');
		expect(yield* Effect.sync(() => output("server"))).toBe("sharp\n");
	}),
);
