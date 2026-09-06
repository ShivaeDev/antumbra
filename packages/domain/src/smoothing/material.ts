import { type BoardEntryRow, localDay, type SmoothingDay, type SmoothingSpan } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { entriesToSmooth, pieceToSmooth } from "@antumbra/prompts";
import { Effect } from "effect";

const pad = (value: number): string => String(value).padStart(2, "0");

const clockTime = (at: Date): string => `${pad(at.getHours())}:${pad(at.getMinutes())}`;

const stampedTime = (at: Date): string => `${localDay(at)} ${clockTime(at)}`;

const authorIds = (entries: ReadonlyArray<BoardEntryRow>): ReadonlyArray<string> =>
	[...new Set(entries.map((entry) => entry.authorAgentId))].filter((agentId) => agentId !== null);

export const makeSmoothingMaterial = Effect.gen(function* () {
	const db = yield* Database;
	const written = Effect.fnUntraced(function* (entries: ReadonlyArray<BoardEntryRow>, at: (moment: Date) => string) {
		const authors = yield* db.Agent.where((agent) => agent.id.in(authorIds(entries))).all();
		const roleOf = new Map(authors.map((agent) => [agent.id, agent.role]));
		return entries.map((entry) => ({
			at: at(entry.createdAt),
			body: entry.body,
			kind: entry.kind,
			role: entry.authorAgentId === null ? "admiral" : (roleOf.get(entry.authorAgentId) ?? "agent"),
		}));
	});
	return {
		day: Effect.fnUntraced(function* (day: SmoothingDay) {
			return entriesToSmooth({ day: day.day, entries: yield* written(day.entries, clockTime) });
		}),
		piece: Effect.fnUntraced(function* (title: string, span: SmoothingSpan) {
			return pieceToSmooth({ entries: yield* written(span.entries, stampedTime), piece: title });
		}),
	};
});
