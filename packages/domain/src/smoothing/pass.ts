import { BoardScope, Boards, EntryInput, type SmoothingDay } from "@antumbra/boards";
import type { AgentPrompt } from "@antumbra/prompts";
import { pieceSmootherWords, smootherWords } from "@antumbra/prompts";
import type { SinkFor } from "@antumbra/sessions";
import { Effect, Option } from "effect";
import { SmoothingPassFailed } from "#errors.ts";
import { makeSmoothingMaterial } from "#smoothing/material.ts";
import type { PieceToSmooth } from "#smoothing/pieces.ts";
import { makeSmootherSession } from "#smoothing/session.ts";
import type { SmootherAtHand } from "#smoothing/smoother.ts";
import type { SummaryWritten } from "#smoothing/summary-tool.ts";

const DETAIL: Record<SummaryWritten["_tag"], string> = {
	silent: "the smoother wrote no summary",
	timedOut: "the smoother did not answer in time",
	written: "the smoother wrote an empty summary",
};

export const makeSmoothingPasses = (sinkFor: SinkFor) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const material = yield* makeSmoothingMaterial;
		const openSmoother = yield* makeSmootherSession(sinkFor);
		const summaryOf = Effect.fnUntraced(function* (smoother: SmootherAtHand, orders: AgentPrompt, told: AgentPrompt, subject: string) {
			const written = yield* openSmoother({
				agentId: smoother.agentId,
				backend: smoother.backend,
				cwd: smoother.cwd,
				material: told,
				orders,
				settings: smoother.settings,
			});
			const summary = written._tag === "written" ? written.text.trim() : "";
			return summary === "" ? yield* new SmoothingPassFailed({ detail: DETAIL[written._tag], subject, voyageId: smoother.voyageId }) : summary;
		});
		return {
			day: Effect.fnUntraced(function* (smoother: SmootherAtHand, day: SmoothingDay) {
				const body = yield* summaryOf(smoother, smootherWords, yield* material.day(day), day.day);
				yield* boards.write(
					BoardScope.Voyage({ voyageId: smoother.voyageId }),
					EntryInput.Summary({
						authorAgentId: Option.some(smoother.agentId),
						body,
						coversFrom: day.coversFrom,
						coversTo: day.coversTo,
						level: "day",
					}),
				);
			}),
			piece: Effect.fnUntraced(function* (smoother: SmootherAtHand, piece: PieceToSmooth) {
				const body = yield* summaryOf(smoother, pieceSmootherWords, yield* material.piece(piece.title, piece.span), piece.title);
				yield* boards.write(
					BoardScope.Piece({ pieceId: piece.pieceId }),
					EntryInput.Summary({
						authorAgentId: Option.some(smoother.agentId),
						body,
						coversFrom: piece.span.coversFrom,
						coversTo: piece.span.coversTo,
						level: "piece",
					}),
				);
				yield* boards.write(
					BoardScope.Voyage({ voyageId: smoother.voyageId }),
					EntryInput.PieceSummary({ authorAgentId: Option.some(smoother.agentId), body, pieceId: piece.pieceId }),
				);
			}),
		};
	});
