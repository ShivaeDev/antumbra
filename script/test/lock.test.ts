import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { it } from "@effect/vitest";
import { Effect, Exit } from "effect";
import { lock } from "proper-lockfile";
import { expect } from "vitest";

const fixture = fileURLToPath(new URL("./fixtures/locked-child.ts", import.meta.url));
const testDirectory = Effect.acquireRelease(
	Effect.promise(() => mkdtemp(join(tmpdir(), "antumbra-test-lock-"))),
	(directory) => Effect.promise(() => rm(directory, { recursive: true, force: true })),
);
const start = (path: string) =>
	Effect.acquireRelease(
		Effect.sync(() => {
			const child = spawn(process.execPath, [fixture, path], { stdio: ["pipe", "pipe", "inherit"] });
			const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]();
			const exited = once(child, "exit");
			return { child, exited, lines };
		}),
		({ child, exited }) =>
			Effect.sync(() => {
				child.kill("SIGTERM");
				if (!child.stdin.destroyed) child.stdin.write("finish");
			}).pipe(Effect.andThen(Effect.promise(() => exited))),
	);

it.effect(
	"queues a second process until the first test child exits, including failure",
	Effect.fnUntraced(function* () {
		const path = join(yield* testDirectory, "tests");
		const first = yield* start(path);
		expect((yield* Effect.promise(() => first.lines.next())).value).toBe("acquired");
		const second = yield* start(path);
		expect((yield* Effect.promise(() => second.lines.next())).value).toBe("Waiting for another local test run to finish...");
		first.child.stdin.write("finish");
		expect((yield* Effect.promise(() => first.exited))[0]).toBe(7);
		expect((yield* Effect.promise(() => second.lines.next())).value).toBe("acquired");
		second.child.stdin.write("finish");
		expect((yield* Effect.promise(() => second.exited))[0]).toBe(7);
	}, Effect.scoped),
);

it.effect(
	"keeps the lease during interrupted child cleanup",
	Effect.fnUntraced(function* () {
		const path = join(yield* testDirectory, "tests");
		const first = yield* start(path);
		expect((yield* Effect.promise(() => first.lines.next())).value).toBe("acquired");
		first.child.kill("SIGTERM");
		expect((yield* Effect.promise(() => first.lines.next())).value).toBe("stopping");
		const attempt = yield* Effect.exit(
			Effect.acquireRelease(
				Effect.tryPromise(() => lock(path, { realpath: false })),
				(release) => Effect.promise(() => release()),
			),
		);
		expect(Exit.isFailure(attempt)).toBe(true);
		first.child.stdin.write("finish");
		expect((yield* Effect.promise(() => first.exited))[0]).toBe(130);
		const release = yield* Effect.promise(() => lock(path, { realpath: false }));
		yield* Effect.promise(() => release());
	}, Effect.scoped),
);
