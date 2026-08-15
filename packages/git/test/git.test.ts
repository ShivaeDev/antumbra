import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Fiber, Layer, Sink, Stream } from "effect";
import { TestClock } from "effect/testing";
import {
	type ChildProcess,
	ChildProcessSpawner,
} from "effect/unstable/process";
import { inspectWorktree, refreshMirror } from "#index.ts";

interface ScriptedOutput {
	readonly exitCode: number;
	readonly stderr: string;
	readonly stdout: string;
}

const bytes = (value: string) =>
	Stream.fromIterable([new TextEncoder().encode(value)]);

const processHandle = (output: ScriptedOutput) => {
	const stdout = bytes(output.stdout);
	const stderr = bytes(output.stderr);
	return ChildProcessSpawner.makeHandle({
		all: Stream.merge(stdout, stderr),
		exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(output.exitCode)),
		getInputFd: () => Sink.drain,
		getOutputFd: () => Stream.empty,
		isRunning: Effect.succeed(false),
		kill: () => Effect.void,
		pid: ChildProcessSpawner.ProcessId(1),
		stderr,
		stdin: Sink.drain,
		stdout,
		unref: Effect.succeed(Effect.void),
	});
};

const waitingProcess = ChildProcessSpawner.makeHandle({
	all: Stream.never,
	exitCode: Effect.never,
	getInputFd: () => Sink.drain,
	getOutputFd: () => Stream.empty,
	isRunning: Effect.succeed(true),
	kill: () => Effect.void,
	pid: ChildProcessSpawner.ProcessId(2),
	stderr: Stream.never,
	stdin: Sink.drain,
	stdout: Stream.never,
	unref: Effect.succeed(Effect.void),
});

const scriptedGit = (
	outputs: ReadonlyArray<ScriptedOutput | "wait">,
): {
	readonly commands: Array<ChildProcess.Command>;
	readonly layer: Layer.Layer<ChildProcessSpawner.ChildProcessSpawner>;
	readonly terminated: Array<number>;
} => {
	const commands: Array<ChildProcess.Command> = [];
	const terminated: Array<number> = [];
	let cursor = 0;
	const service = ChildProcessSpawner.make((command) =>
		Effect.acquireRelease(
			Effect.sync(() => {
				commands.push(command);
				const processIndex = cursor;
				const output = outputs[processIndex];
				cursor += 1;
				const handle =
					output === "wait" || output === undefined
						? waitingProcess
						: processHandle(output);
				return { handle, processIndex };
			}),
			({ processIndex }) =>
				Effect.sync(() => {
					terminated.push(processIndex);
				}),
		).pipe(Effect.map(({ handle }) => handle)),
	);
	return {
		commands,
		layer: Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, service),
		terminated,
	};
};

const success = (stdout = ""): ScriptedOutput => ({
	exitCode: 0,
	stderr: "",
	stdout,
});

const tempRoot = Effect.acquireRelease(
	Effect.sync(() => mkdtempSync(join(tmpdir(), "antumbra-git-"))),
	(root) => Effect.sync(() => rmSync(root, { force: true, recursive: true })),
);

describe("Effect Git", () => {
	it.effect("decodes worktree state from successful process output", () => {
		const fake = scriptedGit([success(""), success("2\n")]);
		return Effect.gen(function* () {
			const state = yield* inspectWorktree("/repo").pipe(
				Effect.provide(fake.layer),
			);
			expect(state).toEqual({ _tag: "clean", unpushedCommits: 2 });
		});
	});

	it.effect("reports local changes without depending on remote refs", () => {
		const fake = scriptedGit([
			success("?? notes.md\n"),
			{ exitCode: 128, stderr: "remote refs unavailable", stdout: "" },
		]);
		return Effect.gen(function* () {
			const state = yield* inspectWorktree("/repo").pipe(
				Effect.provide(fake.layer),
			);
			expect(state).toEqual({ _tag: "changed" });
		});
	});

	it.effect(
		"keeps invalid subprocess output distinct from process failure",
		() => {
			const fake = scriptedGit([{ exitCode: 1.5, stderr: "", stdout: "" }]);
			return Effect.gen(function* () {
				const failure = yield* Effect.flip(
					refreshMirror("/repo").pipe(Effect.provide(fake.layer)),
				);
				expect(failure._tag).toBe("GitOutputInvalid");
			});
		},
	);

	it.effect(
		"disables terminal input without disabling credential helpers",
		() => {
			const fake = scriptedGit([success(""), success("")]);
			return Effect.gen(function* () {
				yield* refreshMirror("/repo").pipe(Effect.provide(fake.layer));
				const command = fake.commands[0];
				if (command === undefined || command._tag !== "StandardCommand") {
					return expect.unreachable("git command was not captured");
				}
				expect(command.options.stdin).toBe("ignore");
				expect(command.options.extendEnv).toBe(true);
				expect(command.options.env).toEqual({ GIT_TERMINAL_PROMPT: "0" });
			});
		},
	);

	it.effect(
		"classifies noninteractive credential failure as retryable auth",
		() => {
			const fake = scriptedGit([
				success(""),
				{
					exitCode: 128,
					stderr:
						"fatal: could not read Username for 'https://example.test': terminal prompts disabled",
					stdout: "",
				},
			]);
			return Effect.gen(function* () {
				const failure = yield* Effect.flip(
					refreshMirror("/repo").pipe(Effect.provide(fake.layer)),
				);
				expect(failure._tag).toBe("GitAuthRequired");
				if (failure._tag === "GitAuthRequired") {
					expect(failure.operation).toBe("refresh-mirror");
				}
			});
		},
	);

	it.effect("interrupts a stuck process at the operation deadline", () => {
		const fake = scriptedGit(["wait"]);
		return Effect.gen(function* () {
			const fiber = yield* Effect.flip(
				refreshMirror("/repo").pipe(Effect.provide(fake.layer)),
			).pipe(Effect.forkChild);
			yield* TestClock.adjust(3 * 60 * 1_000 + 1);
			const failure = yield* Fiber.join(fiber);
			expect(failure._tag).toBe("GitTimedOut");
			expect(fake.terminated).toEqual([0]);
			const command = fake.commands[0];
			if (command === undefined || command._tag !== "StandardCommand") {
				return expect.unreachable("git command was not captured");
			}
			expect(command.options.forceKillAfter).toBe(5_000);
		});
	});

	it.live("inspects a real repository through the Node process layer", () =>
		Effect.gen(function* () {
			const root = yield* tempRoot;
			const repo = join(root, "repo");
			execFileSync("git", ["init", "-b", "main", repo]);
			execFileSync("git", [
				"-C",
				repo,
				"config",
				"user.email",
				"fixture@antumbra",
			]);
			execFileSync("git", ["-C", repo, "config", "user.name", "fixture"]);
			writeFileSync(join(repo, "README.md"), "ahoy\n");
			execFileSync("git", ["-C", repo, "add", "."]);
			execFileSync("git", ["-C", repo, "commit", "-m", "init"]);
			const state = yield* inspectWorktree(repo).pipe(
				Effect.provide(NodeServices.layer),
			);
			expect(state).toEqual({ _tag: "clean", unpushedCommits: 1 });
		}),
	);
});
