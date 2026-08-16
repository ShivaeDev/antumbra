import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProvisionRequest, Runner } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { makeLocalRunner } from "#local.ts";

export const AGENT = "0123456789abcdef";

export const git = (args: ReadonlyArray<string>): Effect.Effect<string> =>
	Effect.sync(() => execFileSync("git", args, { encoding: "utf8" }));

export const provision = (runner: Runner, request: ProvisionRequest) => {
	const plan = runner.plan(request);
	return runner.provision(plan).pipe(Effect.as(plan));
};

const acquireTempRoot = Effect.acquireRelease(
	Effect.sync(() => mkdtempSync(join(tmpdir(), "antumbra-runner-"))),
	(root) => Effect.sync(() => rmSync(root, { force: true, recursive: true })),
);

export const makeSourceRepo = (root: string) =>
	Effect.gen(function* () {
		const source = join(root, "source");
		yield* git(["init", "-b", "main", source]);
		yield* git(["-C", source, "config", "user.email", "fixture@antumbra"]);
		yield* git(["-C", source, "config", "user.name", "antumbra fixture"]);
		yield* Effect.sync(() => {
			writeFileSync(join(source, ".gitignore"), "dist/\n");
			writeFileSync(join(source, "README.md"), "ahoy\n");
		});
		yield* git(["-C", source, "add", "."]);
		yield* git(["-C", source, "commit", "-m", "init"]);
		return source;
	});

export const makeHarbor = Effect.gen(function* () {
	const root = yield* acquireTempRoot;
	const source = yield* makeSourceRepo(root);
	const runner = makeLocalRunner({
		berthsRoot: join(root, "berths"),
		reposRoot: join(root, "repos"),
	});
	return { root, runner, source };
});
