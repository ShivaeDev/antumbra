import {
	type AgentBackend,
	type BackendFailure,
	noSessionAudit,
} from "@antumbra/plugin-api";
import { Effect, RcRef } from "effect";
import type { OpencodeServer } from "#server.ts";
import { openOpencodeSession } from "#session.ts";

// why: fork is opencode's own verb — it forks a session at a message — and
// live interrupt is its abort. multiClient stays false: the server genuinely
// serves several clients at once and `opencode attach` proves it, but nothing
// here holds more than one connection, and reporting the server's ability
// would be a claim about ours.
//
// why: imageInput stays false until a session here has actually sent a file
// part. The gate is fail-closed by design, so an unproven path reads as absent
// rather than as a capability nobody exercised.
//
// why: no capacity source. opencode fronts many providers and reports no rate
// limit of its own on the event stream, and a source that never speaks would
// place holds nobody could clear. Absent asserts nothing, which is the truth.
export const opencodeBackend = (
	server: RcRef.RcRef<OpencodeServer, BackendFailure>,
): AgentBackend => ({
	// why: opencode keeps every session, including the children a task spawned,
	// and `GET /session/{id}/children` would answer a census. Nothing reads it
	// yet, so the backend says it has no second surface rather than offering one
	// that returns an empty tree for every question.
	audit: noSessionAudit,
	capabilities: {
		fork: true,
		imageInput: false,
		liveInterrupt: true,
		multiClient: false,
	},
	openSession: (options) =>
		RcRef.get(server).pipe(
			Effect.flatMap((live) => openOpencodeSession(live, options)),
		),
	tag: "opencode",
});
