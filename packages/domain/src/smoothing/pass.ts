import { type BoardScope, Boards, EntryInput, type SmoothingDay } from "@antumbra/boards";
import type { AgentBackend } from "@antumbra/plugin-api";
import type { SinkFor } from "@antumbra/sessions";
import type { ResolvedAgentSettings } from "@antumbra/settings";
import { Effect, Option } from "effect";
import { SmoothingPassFailed } from "#errors.ts";
import { makeSmoothingMaterial } from "#smoothing/material.ts";
import { makeSmootherSession } from "#smoothing/session.ts";
import type { SummaryWritten } from "#smoothing/summary-tool.ts";

const DETAIL: Record<SummaryWritten["_tag"], string> = {
	silent: "the smoother wrote no summary",
	timedOut: "the smoother did not answer in time",
	written: "the smoother wrote an empty summary",
};

export interface SmoothingPass {
	readonly agentId: string;
	readonly backend: AgentBackend;
	readonly cwd: string;
	readonly day: SmoothingDay;
	readonly scope: BoardScope;
	readonly settings: ResolvedAgentSettings;
	readonly voyageId: string;
}

export const makeSmoothingPass = (sinkFor: SinkFor) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const materialFor = yield* makeSmoothingMaterial;
		const openSmoother = yield* makeSmootherSession(sinkFor);
		return Effect.fnUntraced(function* (pass: SmoothingPass) {
			const written = yield* openSmoother({
				agentId: pass.agentId,
				backend: pass.backend,
				cwd: pass.cwd,
				material: yield* materialFor(pass.day),
				settings: pass.settings,
			});
			const summary = written._tag === "written" ? written.text.trim() : "";
			if (summary === "") {
				return yield* new SmoothingPassFailed({
					day: pass.day.day,
					detail: DETAIL[written._tag],
					voyageId: pass.voyageId,
				});
			}
			yield* boards.write(
				pass.scope,
				EntryInput.Summary({
					authorAgentId: Option.some(pass.agentId),
					body: summary,
					coversFrom: pass.day.coversFrom,
					coversTo: pass.day.coversTo,
					level: "day",
				}),
			);
		});
	});
