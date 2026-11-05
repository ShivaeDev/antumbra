import { pending } from "@antumbra/domain-sessions/queries/pending.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { voyageAgent } from "#rows/voyage-agent.ts";

export const pendingOperations = query("pendingOperations", {
	input: {},
	output: Schema.Array(sessionOperation.Row),
	reads: [...pending.reads, session, voyageAgent, voyage],
});
