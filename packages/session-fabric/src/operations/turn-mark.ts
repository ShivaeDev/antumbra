import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

// why: the reading an act built on something the Session did hands back when it
// commits, so an act words have overtaken refuses. Absent means nothing is
// holding this Session at all, which is a different answer from a count of
// zero and is never flattened into one.
export const makeTurnMark = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("sessionFabric.turnMark")((sessionId: string) =>
		attachments.turnMark(sessionId),
	);
