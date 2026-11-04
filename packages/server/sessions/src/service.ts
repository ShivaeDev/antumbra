import { ExecutionHistory } from "@antumbra/server-journal/postgres/execution/service.ts";
import { defineService } from "@shivaedev/service/defineService.ts";
import { Effect } from "effect";
import { charter } from "#commands/charter.ts";
import { request } from "#commands/request.ts";
import { retry } from "#commands/retry.ts";
import { stop } from "#commands/stop.ts";
import { forAgent } from "#queries/for-agent.ts";
import { opening } from "#queries/opening.ts";
import { operations } from "#queries/operations.ts";
import { pending } from "#queries/pending.ts";
import { reading } from "#queries/reading.ts";
import { toolCall } from "#queries/tool-call.ts";
import { transcriptSources } from "#queries/transcript-sources.ts";
import { tree } from "#queries/tree.ts";
export const Sessions = defineService({
	id: "@antumbra/server-sessions/Sessions",
	requires: [ExecutionHistory],
	initialize: Effect.void,
	methods: () => ({ request, retry, charter, stop, operations, opening, transcriptSources, toolCall, reading, tree, forAgent, pending }),
});
