import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { acceptProcessOutput } from "#result.ts";

describe("git process output", () => {
	it.effect("retains command output", () =>
		Effect.gen(function* () {
			expect(yield* acceptProcessOutput("inspect-worktree", { exitCode: 0, stderr: "", stdout: "?? notes.md\n" })).toBe("?? notes.md\n");
		}),
	);
	it.effect("distinguishes credentials from a command failure", () =>
		Effect.gen(function* () {
			expect(
				(yield* Effect.flip(acceptProcessOutput("refresh-mirror", { exitCode: 128, stderr: "fatal: authentication failed", stdout: "" })))._tag,
			).toBe("GitAuthRequired");
			expect((yield* Effect.flip(acceptProcessOutput("inspect-worktree", { exitCode: 128, stderr: "not a git repository", stdout: "" })))._tag).toBe(
				"GitCommandFailed",
			);
		}),
	);
});
