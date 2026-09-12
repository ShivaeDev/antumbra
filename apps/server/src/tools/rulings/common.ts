import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { byVoyage } from "@antumbra/domain-pieces/queries/by-voyage.ts";
import { addContext } from "@antumbra/domain-rulings/commands/add-context.ts";
import { request } from "@antumbra/domain-rulings/commands/request.ts";
import { RulingId } from "@antumbra/domain-rulings/ids.ts";
import { binding } from "@antumbra/domain-rulings/queries/binding.ts";
import { rulingBlock } from "@antumbra/domain-rulings/queries/mail-words.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { answered, refused } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Option, Stream } from "effect";
import { hold } from "#tools/rulings/hold.ts";
import { readRulingsSpec } from "#tools/rulings/readings.ts";
import { addContextSpec, requestRulingSpec } from "#tools/rulings/requests.ts";
import { authorityFor, readRuling, replayed, subjectFor } from "#tools/rulings/runtime.ts";

const requestTool = bind(requestRulingSpec, (context, input) =>
	Effect.gen(function* () {
		const live = yield* Live;
		const gates = (input.gates ?? []).map((id) => PieceId.make(id));
		if (gates.length > 0) {
			if (context.voyageId === undefined) return refused("you are not on a voyage");
			const pieces = Option.getOrThrow(yield* Stream.runHead(live.live(byVoyage, { voyageId: VoyageId.make(context.voyageId) })));
			const strangers = gates.filter((id) => !pieces.some((piece) => piece.id === id));
			if (strangers.length > 0) return refused(`these pieces are not on your voyage: ${strangers.join(", ")}`);
		}
		return yield* answered(
			context,
			requestRulingSpec.name,
			Effect.gen(function* () {
				const commit = yield* Commit;
				const authority = yield* authorityFor(context);
				const rulingId = RulingId.make(requestId(context));
				yield* replayed(
					commit.commit(request, {
						...input,
						requestId: requestId(context),
						choices: input.choices ?? [],
						subjects: subjectFor(context, input.tags),
						gates,
						requester: { kind: "agent", agentId: context.agentId },
						rung: authority.rung,
					}),
				);
				if (input.urgency === "blocking") return yield* hold(rulingId, null);
				return `ruling ${rulingId} requested — ${input.radius} radius, ${input.urgency}. The answer reaches you as mail and wakes you when you are at rest; carry on with what does not need it.`;
			}),
			(text) => text,
		);
	}),
);

const contextTool = bind(addContextSpec, (context, input) =>
	answered(
		context,
		addContextSpec.name,
		Effect.gen(function* () {
			const commit = yield* Commit;
			const rulingId = RulingId.make(input.rulingId);
			const before = yield* readRuling(rulingId);
			yield* replayed(commit.commit(addContext, { requestId: requestId(context), rulingId, authorAgentId: context.agentId, body: input.context }));
			if (before.urgency === "blocking" && before.requester.kind === "agent" && before.requester.agentId === context.agentId)
				return yield* hold(rulingId, requestId(context));
			return `context added to ruling ${rulingId} — it stands beside the original context for whoever answers.`;
		}),
		(text) => text,
	),
);

const readingTool = bind(readRulingsSpec, (context, input) =>
	answered(
		context,
		readRulingsSpec.name,
		Effect.gen(function* () {
			const live = yield* Live;
			return Option.getOrThrow(yield* Stream.runHead(live.live(binding, { subjects: subjectFor(context, input.tags) })));
		}),
		(rulings) => (rulings.length === 0 ? "No standing rulings apply to you." : rulings.map(rulingBlock).join("\n\n")),
	),
);

export const commonRulingTools = [requestTool, contextTool, readingTool] as const;
