import { describe, expect, it } from "@effect/vitest";
import { Effect, Fiber, Layer, Sink, Stream } from "effect";
import { TestClock } from "effect/testing";
import { ChildProcessSpawner } from "effect/unstable/process";
import { inspectWorktree, refreshMirror } from "#index.ts";

interface ScriptedOutput {
	readonly exitCode: number;
	readonly stderr: string;
	readonly stdout: string;
}

const bytes = (value: string) => Stream.fromIterable([new TextEncoder().encode(value)]);

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
	readonly layer: Layer.Layer<ChildProcessSpawner.ChildProcessSpawner>;
	readonly terminated: Array<number>;
} => {
	const terminated: Array<number> = [];
	let cursor = 0;
	const service = ChildProcessSpawner.make(() =>
		Effect.acquireRelease(
			Effect.sync(() => {
				const processIndex = cursor;
				const output = outputs[processIndex];
				cursor += 1;
				const handle = output === "wait" || output === undefined ? waitingProcess : processHandle(output);
				return { handle, processIndex };
			}),
			({ processIndex }) =>
				Effect.sync(() => {
					terminated.push(processIndex);
				}),
		).pipe(Effect.map(({ handle }) => handle)),
	);
	return {
		layer: Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, service),
		terminated,
	};
};

const success = (stdout = ""): ScriptedOutput => ({
	exitCode: 0,
	stderr: "",
	stdout,
});

describe("Effect Git", () => {
	it.effect("decodes worktree state from successful process output", () => {
		const fake = scriptedGit([success(""), success("2\n")]);
		return Effect.gen(function* () {
			const state = yield* inspectWorktree("/repo").pipe(Effect.provide(fake.layer));
			expect(state).toEqual({ _tag: "clean", unpushedCommits: 2 });
		});
	});

	it.effect("reports local changes without depending on remote refs", () => {
		const fake = scriptedGit([success("?? notes.md\n")]);
		return Effect.gen(function* () {
			const state = yield* inspectWorktree("/repo").pipe(Effect.provide(fake.layer));
			expect(state).toEqual({ _tag: "changed" });
		});
	});

	it.effect("classifies noninteractive credential failure as retryable auth", () => {
		const fake = scriptedGit([
			success(""),
			{
				exitCode: 128,
				stderr: "fatal: could not read Username for 'https://example.test': terminal prompts disabled",
				stdout: "",
			},
		]);
		return Effect.gen(function* () {
			const failure = yield* Effect.flip(refreshMirror("/repo").pipe(Effect.provide(fake.layer)));
			expect(failure._tag).toBe("GitAuthRequired");
			if (failure._tag === "GitAuthRequired") {
				expect(failure.operation).toBe("refresh-mirror");
			}
		});
	});

	it.effect("interrupts a stuck process at the operation deadline", () => {
		const fake = scriptedGit(["wait"]);
		return Effect.gen(function* () {
			const fiber = yield* Effect.flip(refreshMirror("/repo").pipe(Effect.provide(fake.layer))).pipe(Effect.forkChild);
			yield* TestClock.adjust(3 * 60 * 1_000 + 1);
			const failure = yield* Fiber.join(fiber);
			expect(failure._tag).toBe("GitTimedOut");
			expect(fake.terminated).toEqual([0]);
		});
	});
});
