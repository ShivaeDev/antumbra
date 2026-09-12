import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { byId } from "@antumbra/domain-agents/queries/by-id.ts";
import { localDay } from "@antumbra/domain-boards/queries/smoothing-span.ts";
import type { SmoothingTarget } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import { entriesToSmooth, pieceToSmooth } from "@antumbra/platform-prompts/smoother.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";

const pad = (value: number): string => String(value).padStart(2, "0");

export const material = Effect.fn("Smoothing.material")(function* (target: typeof SmoothingTarget.Type) {
	const live = yield* Live;
	const roles = new Map<string, string>();
	for (const entry of target.entries) {
		if (entry.authorAgentId !== null && !roles.has(entry.authorAgentId)) {
			const author = yield* live.read(byId, { id: AgentId.make(entry.authorAgentId) });
			roles.set(entry.authorAgentId, author?.role ?? "agent");
		}
	}
	const entries = target.entries.map((entry) => {
		const at = new Date(entry.createdAt);
		const clock = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
		return {
			at: target.level === "day" ? clock : `${localDay(at)} ${clock}`,
			body: entry.body,
			kind: entry.kind,
			role: entry.authorAgentId === null ? "admiral" : (roles.get(entry.authorAgentId) ?? "agent"),
		};
	});
	return target.level === "day" ? entriesToSmooth({ day: target.title, entries }) : pieceToSmooth({ piece: target.title, entries });
});
