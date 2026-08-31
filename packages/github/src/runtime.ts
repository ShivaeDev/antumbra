import type { GitError, GitPushRefused } from "@antumbra/git";
import { type ChangeHostError, ChangeHostRefused, ChangeHostUnavailable } from "@antumbra/plugin-api";
import { NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import type { GhError } from "#errors.ts";

export const GITHUB_TAG = "github";

// Provide process services here so ChangeHost methods remain requirement-free.
export const onThisMachine = <A, E>(program: Effect.Effect<A, E, ChildProcessSpawner.ChildProcessSpawner>): Effect.Effect<A, E> =>
	Effect.provide(program, NodeServices.layer);

export const toHostError = (failure: GhError): ChangeHostError =>
	failure._tag === "GhCommandFailed"
		? new ChangeHostRefused({ detail: failure.message, host: GITHUB_TAG })
		: new ChangeHostUnavailable({ detail: failure.message, host: GITHUB_TAG });

export const toPushRefusal = (failure: GitError | GitPushRefused): ChangeHostError =>
	new ChangeHostRefused({
		detail: failure._tag === "GitPushRefused" ? failure.message : `${failure.operation}: ${failure.detail}`,
		host: GITHUB_TAG,
	});
