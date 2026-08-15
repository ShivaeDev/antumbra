import { bind, standDownSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { Deferred, Effect } from "effect";
import type { AgentDeps } from "#deps.ts";
import { called } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

// why: the retire is queued and never awaited — the act that ends this session
// cannot be one this session waits on.
const standDown = (deps: AgentDeps, identity: SessionIdentity) =>
	called(identity, standDownSpec.name).pipe(
		Effect.andThen(
			Deferred.await(deps.kernelReach).pipe(
				Effect.flatMap((reach) => reach.queueRetire(identity.agentId)),
				Effect.forkDetach,
			),
		),
		Effect.as({ ok: true, text: "standing down" }),
	);

export const standDownTool = (
	deps: AgentDeps,
	identity: SessionIdentity,
): DirectTool => bind(standDownSpec, () => standDown(deps, identity));
