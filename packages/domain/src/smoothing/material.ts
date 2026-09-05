import type { BoardEntryRow, SmoothingDay } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { entriesToSmooth } from "@antumbra/prompts";
import { Effect } from "effect";

const pad = (value: number): string => String(value).padStart(2, "0");

const clockTime = (at: Date): string => `${pad(at.getHours())}:${pad(at.getMinutes())}`;

const authorIds = (entries: ReadonlyArray<BoardEntryRow>): ReadonlyArray<string> =>
	[...new Set(entries.map((entry) => entry.authorAgentId))].filter((agentId) => agentId !== null);

export const makeSmoothingMaterial = Effect.gen(function* () {
	const db = yield* Database;
	return Effect.fnUntraced(function* (day: SmoothingDay) {
		const authors = yield* db.Agent.where((agent) => agent.id.in(authorIds(day.entries))).all();
		const roleOf = new Map(authors.map((agent) => [agent.id, agent.role]));
		return entriesToSmooth({
			day: day.day,
			entries: day.entries.map((entry) => ({
				at: clockTime(entry.createdAt),
				body: entry.body,
				kind: entry.kind,
				role: entry.authorAgentId === null ? "admiral" : (roleOf.get(entry.authorAgentId) ?? "agent"),
			})),
		});
	});
});
