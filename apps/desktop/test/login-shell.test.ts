import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { betweenFences, firstExecutable } from "#adapters/login-shell.ts";

const FENCE = "\u001f";

describe("the login-shell probe reads only what sits between the fences", () => {
	it("ignores whatever the rc files print around the answer", () => {
		expect(
			betweenFences(`motd\n${FENCE}/usr/bin:/opt/x/bin${FENCE}\n`),
		).toEqual(Option.some("/usr/bin:/opt/x/bin"));
	});

	it("is none when the fences never arrive", () => {
		expect(betweenFences("prompt hangs here")).toEqual(Option.none());
		expect(betweenFences(`${FENCE}half`)).toEqual(Option.none());
	});
});

describe("firstExecutable walks the PATH in order", () => {
	const root = mkdtempSync(join(tmpdir(), "antumbra-path-"));
	const first = join(root, "first");
	const second = join(root, "second");
	mkdirSync(first);
	mkdirSync(second);
	const make = (directory: string, name: string, mode: number) => {
		const file = join(directory, name);
		writeFileSync(file, "#!/bin/sh\n");
		chmodSync(file, mode);
		return file;
	};
	const searchPath = [first, second].join(delimiter);

	it("skips a non-executable file and takes the first executable one", () => {
		make(first, "tool", 0o644);
		const wanted = make(second, "tool", 0o755);
		expect(firstExecutable("tool", searchPath)).toEqual(Option.some(wanted));
	});

	it("is none when nothing on the path is executable by that name", () => {
		expect(firstExecutable("missing", searchPath)).toEqual(Option.none());
		expect(firstExecutable("tool", "")).toEqual(Option.none());
	});
});
