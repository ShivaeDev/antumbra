import { localDay } from "@antumbra/domain-boards/queries/smoothing-span.ts";
import type { SmoothingTarget } from "@antumbra/domain-boards/queries/smoothing-targets.ts";
import { entriesToSmooth, pieceToSmooth } from "@antumbra/platform-prompts/smoother.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Agents } from "@antumbra/server-agents/service.ts";
import { Effect } from "effect";

const pad = (value: number): string => String(value).padStart(2, "0");

export const material = Effect.fn("Smoothing.material")(function* (target: typeof SmoothingTarget.Type) {
	const agentsService = yield* Agents;

	const roles = new Map<string, string>();
	for (const entry of target.entries) {
		if (entry.authorAgentId !== null && !roles.has(entry.authorAgentId)) {
			const author = yield* agentsService.byId({ id: AgentId.make(entry.authorAgentId) }).pipe(Effect.orDie);
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
