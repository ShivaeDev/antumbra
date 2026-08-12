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
import { Cause, Effect, Exit } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { readText, walk } from "#lint/adapters/fs.ts";

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

const failureText = <Value, Error>(
	effect: Effect.Effect<Value, Error>,
): string => {
	const exit = Effect.runSyncExit(effect);
	return Exit.isFailure(exit) ? Cause.pretty(exit.cause) : "(it succeeded)";
};

const asRoot = process.getuid?.() === 0;

describe("filesystem adapter", () => {
	it("walks nested files and skips vendored directories", () => {
		const root = makeRoot();
		mkdirSync(join(root, "src", "node_modules"), { recursive: true });
		writeFileSync(join(root, "src", "mod.ts"), "export const k = 1;\n");
		writeFileSync(
			join(root, "src", "node_modules", "v.ts"),
			"export const v = 1;\n",
		);
		expect(Effect.runSync(walk(root))).toEqual([join(root, "src", "mod.ts")]);
	});

	it("treats a missing directory as an empty walk", () => {
		expect(Effect.runSync(walk(join(makeRoot(), "apps")))).toEqual([]);
	});

	it("treats a missing file as empty text", () => {
		expect(
			Effect.runSync(readText(join(makeRoot(), "pnpm-workspace.yaml"))),
		).toBe("");
	});

	// why: swallowing these would hand the reporter a partial inventory and let
	// an unreadable tree print a clean pass.
	it("fails loudly when a file cannot be read", () => {
		const root = makeRoot();
		mkdirSync(join(root, "package.json"));
		const text = failureText(readText(join(root, "package.json")));
		expect(text).toContain("FilesystemFailure");
		expect(text).toContain(join(root, "package.json"));
	});

	it.skipIf(asRoot)("fails loudly when a directory cannot be listed", () => {
		const root = makeRoot();
		const blocked = join(root, "packages");
		mkdirSync(blocked);
		chmodSync(blocked, 0o000);
		const text = failureText(walk(blocked));
		chmodSync(blocked, 0o755);
		expect(text).toContain("FilesystemFailure");
		expect(text).toContain(blocked);
	});
});
