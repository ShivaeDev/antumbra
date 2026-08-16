import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { NodeFileSystem } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Cause, Effect, Exit } from "effect";
import { afterEach, expect } from "vitest";
import { readOptionalText, readRequiredText, walk } from "#lint/adapters/fs.ts";

const roots: string[] = [];

const makeRoot = (): string => {
	const root = mkdtempSync(join(tmpdir(), "antumbra-fs-"));
	roots.push(root);
	return root;
};

afterEach(() => {
	for (const root of roots.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
});

const failureText = <Value, Error, Requirements>(
	effect: Effect.Effect<Value, Error, Requirements>,
): Effect.Effect<string, never, Requirements> =>
	Effect.map(Effect.exit(effect), (exit) =>
		Exit.isFailure(exit) ? Cause.pretty(exit.cause) : "(it succeeded)",
	);

const asRoot = process.getuid?.() === 0;

it.layer(NodeFileSystem.layer)("filesystem adapter", (it) => {
	it.effect("walks nested files and skips vendored directories", () =>
		Effect.gen(function* () {
			const root = makeRoot();
			mkdirSync(join(root, "src", "node_modules"), { recursive: true });
			writeFileSync(join(root, "src", "mod.ts"), "export const k = 1;\n");
			writeFileSync(
				join(root, "src", "node_modules", "v.ts"),
				"export const v = 1;\n",
			);
			expect(yield* walk(root)).toEqual([join(root, "src", "mod.ts")]);
		}),
	);

	it.effect("treats a missing directory as an empty walk", () =>
		Effect.gen(function* () {
			expect(yield* walk(join(makeRoot(), "apps"))).toEqual([]);
		}),
	);

	it.effect("treats a missing optional file as empty text", () =>
		Effect.gen(function* () {
			expect(yield* readOptionalText(join(makeRoot(), ".gitignore"))).toBe("");
		}),
	);

	it.effect("fails distinctly when a required file is missing", () =>
		Effect.gen(function* () {
			const path = join(makeRoot(), "pnpm-workspace.yaml");
			const text = yield* failureText(readRequiredText(path));
			expect(text).toContain("required input is missing");
			expect(text).toContain(path);
		}),
	);

	// why: swallowing these would hand the reporter a partial inventory and let
	// an unreadable tree print a clean pass.
	it.effect("fails loudly when a file cannot be read", () =>
		Effect.gen(function* () {
			const root = makeRoot();
			mkdirSync(join(root, "package.json"));
			const text = yield* failureText(
				readRequiredText(join(root, "package.json")),
			);
			expect(text).toContain("FilesystemFailure");
			expect(text).toContain(join(root, "package.json"));
		}),
	);

	it.effect.skipIf(asRoot)(
		"fails loudly when a directory cannot be listed",
		() =>
			Effect.gen(function* () {
				const root = makeRoot();
				const blocked = join(root, "packages");
				mkdirSync(blocked);
				chmodSync(blocked, 0o000);
				const text = yield* failureText(walk(blocked));
				chmodSync(blocked, 0o755);
				expect(text).toContain("FilesystemFailure");
				expect(text).toContain(blocked);
			}),
	);
});
