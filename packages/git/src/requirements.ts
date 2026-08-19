import type { Effect } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import type { GitError } from "#errors.ts";

export type GitRequirements = ChildProcessSpawner.ChildProcessSpawner;

export type GitReturn<A> = Effect.fn.Return<A, GitError, GitRequirements>;
