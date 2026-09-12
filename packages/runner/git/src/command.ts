import { Effect } from "effect";
import { type GitCommand, GitProcess } from "#process.ts";
import { acceptProcessOutput } from "#result.ts";

export const runGit = (command: GitCommand) =>
	Effect.flatMap(GitProcess, (process) => process.run(command)).pipe(Effect.flatMap((output) => acceptProcessOutput(command.operation, output)));
