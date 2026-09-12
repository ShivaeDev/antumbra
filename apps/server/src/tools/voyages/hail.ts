import { hail } from "@antumbra/domain-agents/commands/hail.ts";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { captain } from "@antumbra/domain-agents/queries/captain.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";
import { hailCaptainSpec } from "#tools/voyages/specs.ts";

export const hailCaptain = bind(hailCaptainSpec, (context, input) =>
	answered(
		context,
		hailCaptainSpec.name,
		Effect.gen(function* () {
			const commit = yield* Commit;
			const live = yield* Live;
			const request = requestId(context);
			const voyageId = VoyageId.make(input.voyageId);
			yield* commit.commit(hail, { requestId: request, voyageId }).pipe(
				Effect.catchTag("AlreadyDone", () => Effect.void),
				Effect.catchTag("CaptainAlreadyHailed", () => Effect.void),
			);
			const current = yield* live.read(captain, { voyageId });
			return { agentId: current?.id ?? identity(request).agentId, requestId: request };
		}),
		(hailed) => `hailed captain ${hailed.agentId} of voyage ${input.voyageId} — intent ${hailed.requestId}`,
	),
);
