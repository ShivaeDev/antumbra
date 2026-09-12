import { acknowledgeNotice } from "@antumbra/domain-rulings/commands/acknowledge-notice.ts";
import { markDelivered } from "@antumbra/domain-rulings/commands/mark-delivered.ts";
import type { RulingId } from "@antumbra/domain-rulings/ids.ts";
import { askNoticeId, parkNoticeId } from "@antumbra/domain-rulings/ids.ts";
import { byId } from "@antumbra/domain-rulings/queries/by-id.ts";
import { answerWords, notNowWords, questionBackWords } from "@antumbra/domain-rulings/queries/mail-words.ts";
import type { Ruling } from "@antumbra/domain-rulings/rows/ruling.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Option, Stream } from "effect";
import { replayed } from "#tools/rulings/runtime.ts";

const heldEnd = (ruling: Ruling, afterContextId: string | null): Option.Option<string> => {
	if (ruling.answer !== null) return Option.some(`Ruled — your hold is over.\n${answerWords(ruling)}`);
	const after = afterContextId === null ? -1 : ruling.contexts.findIndex((context) => context.id === afterContextId);
	const asked = ruling.contexts
		.slice(after + 1)
		.filter((context) => context.authorAgentId === null)
		.at(-1);
	if (asked !== undefined) return Option.some(questionBackWords(ruling, asked.body));
	return ruling.parked === null ? Option.none() : Option.some(notNowWords(ruling, ruling.parked.note));
};
export const hold = Effect.fn("rulings.hold")(function* (rulingId: RulingId, afterContextId: string | null) {
	const live = yield* Live;
	const commit = yield* Commit;
	const settled = yield* live.live(byId, { id: rulingId }).pipe(
		Stream.filter(Option.isSome),
		Stream.map((found) => ({ ruling: found.value, answer: heldEnd(found.value, afterContextId) })),
		Stream.filter((value) => Option.isSome(value.answer)),
		Stream.runHead,
	);
	const end = Option.getOrThrow(settled);
	if (end.ruling.answer !== null)
		yield* replayed(commit.commit(markDelivered, { requestId: Id.Request.make(`ruling-delivered:${rulingId}`), rulingId }));
	const after = afterContextId === null ? -1 : end.ruling.contexts.findIndex((context) => context.id === afterContextId);
	const notices = end.ruling.contexts
		.slice(after + 1)
		.filter((context) => context.authorAgentId === null)
		.map((context) => askNoticeId(rulingId, context.id));
	if (end.ruling.parked !== null) notices.push(parkNoticeId(rulingId));
	for (const id of notices)
		yield* replayed(commit.commit(acknowledgeNotice, { requestId: Id.Request.make(`ruling-notice-delivered:${id}`), rulingId, id }));
	return Option.getOrThrow(end.answer);
});
