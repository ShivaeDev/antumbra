import { Context, type Effect } from "effect";
import type { GitError, GitOperation } from "#errors.ts";
export interface GitCommand {
	readonly args: ReadonlyArray<string>;
	readonly operation: GitOperation;
	readonly timeoutMillis: number;
}
export class GitProcess extends Context.Service<
	GitProcess,
	{
		readonly run: (command: GitCommand) => Effect.Effect<{ readonly exitCode: number; readonly stderr: string; readonly stdout: string }, GitError>;
	}
>()("@antumbra/runner-git/GitProcess") {}
