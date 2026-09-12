import { runGh } from "@antumbra/edge-github/command.ts";
import { NodeServices } from "@effect/platform-node";
import { expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { ghProcessLayer } from "#adapters/github/process.ts";

const processLayer = ghProcessLayer.pipe(Layer.provide(NodeServices.layer));

it.live("keeps multiline arguments literal and disables prompts in gh processes", () =>
	runGh({
		executable: process.execPath,
		args: [
			"-e",
			"process.stdout.write(JSON.stringify({argument:process.argv[1],prompt:process.env.GH_PROMPT_DISABLED}));",
			"coast\n$(echo injected)",
		],
		operation: "create-change",
		timeoutMillis: 10_000,
	}).pipe(
		Effect.provide(processLayer),
		Effect.tap((stdout) =>
			Effect.sync(() => {
				expect(stdout).toBe(JSON.stringify({ argument: "coast\n$(echo injected)", prompt: "1" }));
			}),
		),
	),
);

it.live("retains partial stdout when gh exits unsuccessfully", () =>
	runGh({
		executable: process.execPath,
		args: ["-e", "process.stdout.write('partial');process.stderr.write('query failed');process.exitCode=1;"],
		operation: "observe-changes",
		timeoutMillis: 10_000,
	}).pipe(
		Effect.provide(processLayer),
		Effect.flip,
		Effect.tap((failure) =>
			Effect.sync(() => {
				expect(failure._tag).toBe("GhCommandFailed");
				if (failure._tag === "GhCommandFailed") expect(failure.stdout).toBe("partial");
			}),
		),
	),
);
