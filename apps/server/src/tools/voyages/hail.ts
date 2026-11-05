import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { hailWords } from "@antumbra/platform-prompts/hail.ts";
import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { identity } from "@antumbra/platform-vocabulary/agents-ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Mail } from "@antumbra/server-mail/service.ts";
import { Effect } from "effect";
import { hailCaptainSpec } from "#tools/voyages/specs.ts";

export const hailCaptain = bind(hailCaptainSpec, (context, input) =>
	answered(
		context,
		hailCaptainSpec.name,
		Effect.gen(function* () {
			const mailService = yield* Mail;
			const agentsService = yield* Agents;

			const request = requestId(context);
			const voyageId = VoyageId.make(input.voyageId);
			const mailed = (agentId: string) =>
				mailService
					.send({
						requestId: Id.Request.make(`hail:${request}`),
						toAgentId: agentId,
						authorAgentId: null,
						precedence: "priority",
						body: hailWords,
					})
					.pipe(
						Effect.catchTag("AlreadyDone", () => Effect.void),
						Effect.orDie,
					);
			yield* agentsService.hail({ requestId: request, voyageId, by: "agent" }).pipe(
				Effect.catchTags({
					AlreadyDone: () => Effect.void,
					CaptainAlreadyHailed: () => Effect.void,
					CaptainStopped: (stopped) => mailed(stopped.agentId),
					VoyageQuiet: (hushed) => mailed(hushed.agentId),
				}),
			);
			const current = yield* agentsService.captain({ voyageId }).pipe(Effect.orDie);
			return { agentId: current?.id ?? identity(request).agentId, requestId: request };
		}),
		(hailed) => `hailed captain ${hailed.agentId} of voyage ${input.voyageId} — intent ${hailed.requestId}`,
	),
);
