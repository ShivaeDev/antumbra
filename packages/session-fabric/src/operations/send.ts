import type { SessionInput } from "@antumbra/plugin-api";
import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

export const makeSend = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("sessionFabric.send")((sessionId: string, input: SessionInput) =>
		attachments.send(sessionId, input),
	);
