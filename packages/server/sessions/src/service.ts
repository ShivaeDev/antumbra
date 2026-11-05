import { ExecutionHistory } from "@antumbra/server-storage/execution/service.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { answerTool } from "#commands/answer-tool.ts";
import { callTool } from "#commands/call-tool.ts";
import { charter } from "#commands/charter.ts";
import { hold } from "#commands/hold.ts";
import { holdCapacity } from "#commands/hold-capacity.ts";
import { request } from "#commands/request.ts";
import { retry } from "#commands/retry.ts";
import { stop } from "#commands/stop.ts";
import { capacityReleased } from "#queries/capacity-released.ts";
import { forAgent } from "#queries/for-agent.ts";
import { opening } from "#queries/opening.ts";
import { operations } from "#queries/operations.ts";
import { pending } from "#queries/pending.ts";
import { reading } from "#queries/reading.ts";
import { toolCall } from "#queries/tool-call.ts";
import { transcriptSources } from "#queries/transcript-sources.ts";
import { tree } from "#queries/tree.ts";
import { unaudited } from "#queries/unaudited.ts";
export const Sessions = defineService({
	id: "@antumbra/server-sessions/Sessions",
	requires: [Records, ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({
		capacityReleased,
		unaudited,
		callTool,
		answerTool,
		holdCapacity,
		hold,
		request,
		retry,
		charter,
		stop,
		operations,
		opening,
		transcriptSources,
		toolCall,
		reading,
		tree,
		forAgent,
		pending,
	}),
});
