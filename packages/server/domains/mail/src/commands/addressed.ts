import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import type { RowValue } from "@antumbra/platform-feature/row.ts";
import { Effect, Option } from "effect";
import type { MessageId } from "#ids.ts";
import type { message } from "#rows/message.ts";

type Reading = ReadHandles<readonly [typeof message]>;

export const addressed = Effect.fnUntraced(function* (rows: Reading, agentId: string, ids: readonly MessageId[]) {
	const held: RowValue<typeof message>[] = [];
	for (const id of ids) {
		if (held.some((stamped) => stamped.id === id)) {
			continue;
		}
		const stored = yield* rows.message.find(id);
		if (Option.isNone(stored) || stored.value.toAgentId !== agentId) {
			return { _tag: "Stray", id } as const;
		}
		held.push(stored.value);
	}
	return { _tag: "Addressed", held } as const;
});
