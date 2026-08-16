import type { GitError, GitPushRefused } from "@antumbra/git";
import {
	type ChangeHostError,
	ChangeHostRefused,
	ChangeHostUnavailable,
} from "@antumbra/plugin-api";
import { NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import type { GhError } from "#errors.ts";

export const GITHUB_TAG = "github";

// why: the spawner is provided here, at the edge of the adapter, so every host
// method satisfies the port's requirement-free signature and no layer above
// has to know this host runs a binary at all.
export const onThisMachine = <A, E>(
	program: Effect.Effect<A, E, ChildProcessSpawner.ChildProcessSpawner>,
): Effect.Effect<A, E> => Effect.provide(program, NodeServices.layer);

// why: a command GitHub answered with a "no" is a refusal the agent can act
// on; anything that stopped us from asking at all — no binary, no login, an
// unreadable answer — is the host being unavailable, and retrying later is the
// only sensible response.
export const toHostError = (failure: GhError): ChangeHostError =>
	failure._tag === "GhCommandFailed"
		? new ChangeHostRefused({ detail: failure.message, host: GITHUB_TAG })
		: new ChangeHostUnavailable({ detail: failure.message, host: GITHUB_TAG });

// why: a branch that cannot be pushed is a refusal too — GitHub is answering
// fine, and this berth has nothing it is allowed to send.
export const toPushRefusal = (
	failure: GitError | GitPushRefused,
): ChangeHostError =>
	new ChangeHostRefused({
		detail:
			failure._tag === "GitPushRefused"
				? failure.message
				: `${failure.operation}: ${failure.detail}`,
		host: GITHUB_TAG,
	});
