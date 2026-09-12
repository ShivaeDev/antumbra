import { proclaim } from "@antumbra/domain-rulings/commands/proclaim.ts";
import { RulingId } from "@antumbra/domain-rulings/ids.ts";
import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Effect } from "effect";
import { proclaimRulingSpec } from "#tools/rulings/proclamation.ts";
import { replayed } from "#tools/rulings/runtime.ts";
export const flagshipRulingTools = [
	bind(proclaimRulingSpec, (context, input) =>
		answered(
			context,
			proclaimRulingSpec.name,
			Effect.gen(function* () {
				const commit = yield* Commit;
				const id = requestId(context);
				yield* replayed(
					commit.commit(proclaim, {
						...input,
						requestId: id,
						by: "flagship",
						radius: "fleet",
						choices: [],
						chosenChoice: null,
						subjects: (input.tags ?? []).map((tag) => ({ kind: "tag", tag })),
						tags: "",
					}),
				);
				return RulingId.make(id);
			}),
			(rulingId) => `ruling ${rulingId} proclaimed by the flagship — it binds the whole fleet until the admiral supersedes it`,
		),
	),
] as const;
