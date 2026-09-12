import { agent } from "@antumbra/domain-agents/rows/agent.ts";
import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { voyageProgress } from "@antumbra/domain-voyages/rows/voyage-progress.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect } from "effect";
import { rulingDisplay } from "#rows/display.ts";
import { rulingGate } from "#rows/gate.ts";
import { type Ruling, ruling } from "#rows/ruling.ts";

const authorityName = (rung: string | null): string => (rung === "flagship" ? "the flagship" : "the admiral");
const choiceLabels = (ruling: Ruling) => ({
	recommendedLabel: ruling.choices.find((choice) => choice.id === ruling.recommendation?.choiceId)?.label ?? null,
	chosenLabel: ruling.choices.find((choice) => choice.id === ruling.answer?.choiceId)?.label ?? null,
});
export const rulingDisplayProjection = projection("rulingDisplay", {
	reads: [ruling, rulingGate, agent, voyageAgent, piece, pieceProgress, repo, voyage, voyageProgress],
	writes: [rulingDisplay],
	run: Effect.fn("rulings.display")(function* (rows, writes) {
		const agents = yield* rows.agent.where({});
		const crews = yield* rows.voyageAgent.where({});
		const pieces = yield* rows.piece.where({});
		const voyages = yield* rows.voyage.where({});
		const repos = yield* rows.repo.where({});
		const concludedPieces = new Set((yield* rows.pieceProgress.where({ concluded: true })).map((piece) => String(piece.id)));
		const concludedVoyages = new Set((yield* rows.voyageProgress.where({ concluded: true })).map((voyage) => String(voyage.id)));
		const gates = yield* rows.rulingGate.where({});
		const speakers = Object.fromEntries(agents.map((agent) => [agent.id, agent.role]));
		const names = {
			agent: speakers,
			piece: Object.fromEntries(pieces.map((piece) => [piece.id, piece.title])),
			repo: Object.fromEntries(repos.map((repo) => [repo.id, repo.name])),
			voyage: Object.fromEntries(voyages.map((voyage) => [voyage.id, voyage.name])),
		};
		for (const ruling of yield* rows.ruling.where({})) {
			const namedVoyage = voyages.find((voyage) => ruling.subjects.some((subject) => subject.kind === "voyage" && subject.id === voyage.id));
			const requester = ruling.requester;
			const crew = requester.kind === "agent" ? crews.find((crew) => crew.agentId === requester.agentId) : undefined;
			const captainVoyage = voyages.find((voyage) => voyage.id === crew?.voyageId);
			const finite = ruling.subjects.flatMap((subject) =>
				subject.kind === "piece" || subject.kind === "voyage" ? [{ kind: subject.kind, id: subject.id }] : [],
			);
			const value = {
				...ruling,
				...choiceLabels(ruling),
				voyage: namedVoyage === undefined ? null : { id: namedVoyage.id, name: namedVoyage.name },
				requesterName: requester.kind === "agent" ? (speakers[requester.agentId] ?? "agent") : requester.by,
				rungName: ruling.rung === "captain" && captainVoyage !== undefined ? `${captainVoyage.name}'s captain` : authorityName(ruling.rung),
				speakers,
				subjectLabels: ruling.subjects.map((subject) => {
					const id = subject.kind === "tag" ? subject.tag : subject.id;
					const label = subject.kind === "tag" ? subject.tag : (names[subject.kind][subject.id] ?? subject.id);
					return { kind: subject.kind, id, label };
				}),
				gatedPieces: gates
					.filter((gate) => gate.rulingId === ruling.id)
					.flatMap((gate) => {
						const piece = pieces.find((piece) => piece.id === gate.pieceId);
						const voyage = voyages.find((voyage) => voyage.id === piece?.voyageId);
						return piece === undefined || voyage === undefined
							? []
							: [{ id: piece.id, title: piece.title, voyageId: voyage.id, voyageName: voyage.name }];
					}),
				stale:
					finite.length > 0 &&
					finite.every((subject) => (subject.kind === "piece" ? concludedPieces.has(subject.id) : concludedVoyages.has(subject.id))),
			};
			if (yield* writes.rulingDisplay.exists(ruling.id)) yield* writes.rulingDisplay.update(ruling.id, value);
			else yield* writes.rulingDisplay.insert(value);
		}
	}),
});
