import type { StoredAgentSession } from "@antumbra/persistence";
import type { SessionAudit } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { SessionTreeLedger } from "#tree/ledger/service.ts";

export const findings = Effect.fn("SessionTreeAudits.findings")(function* (lane: SessionAudit, root: StoredAgentSession, node: StoredAgentSession) {
	if (root.nativeRef === null || node.nativeRef === null) return [];
	const ledger = yield* SessionTreeLedger;
	const recorded = yield* ledger.recorded(node.id);
	return yield* lane.node({ cwd: root.cwd, nodeRef: node.nativeRef, recorded: Effect.succeed(recorded), rootRef: root.nativeRef });
});
