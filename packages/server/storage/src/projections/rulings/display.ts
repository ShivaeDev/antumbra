import type { Ruling } from "@antumbra/domain-rulings/rows/ruling.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as pieceSelection } from "@antumbra/server-storage/records/piece.ts";
import { selection as pieceProgressSelection } from "@antumbra/server-storage/records/piece-progress.ts";
import { selection as repoSelection } from "@antumbra/server-storage/records/repo.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { selection as rulingGateSelection } from "@antumbra/server-storage/records/ruling-gate.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { selection as voyageAgentSelection } from "@antumbra/server-storage/records/voyage-agent.ts";
import { selection as voyageProgressSelection } from "@antumbra/server-storage/records/voyage-progress.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

const authorityName = (rung: string | null): string => (rung === "flagship" ? "the flagship" : "the admiral");
const choiceLabels = (ruling: Ruling) => ({
	recommendedLabel: ruling.choices.find((choice) => choice.id === ruling.recommendation?.choiceId)?.label ?? null,
	chosenLabel: ruling.choices.find((choice) => choice.id === ruling.answer?.choiceId)?.label ?? null,
});
export const rulingDisplayProjection = Effect.fn("rulings.display")(function* (): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;
	const writes = yield* Records;

	const agents = yield* rows.agent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
		.pipe(Effect.orDie);
	const crews = yield* rows.voyageAgent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: voyageAgentSelection })
		.pipe(Effect.orDie);
	const pieces = yield* rows.piece
		.findMany({ where: {}, orderBy: { field: "chartered_order", direction: "asc" }, select: pieceSelection })
		.pipe(Effect.orDie);
	const voyages = yield* rows.voyage
		.findMany({ where: {}, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection })
		.pipe(Effect.orDie);
	const repos = yield* rows.repo
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: repoSelection })
		.pipe(Effect.orDie);
	const concludedPieces = new Set(
		(yield* rows.pieceProgress
			.findMany({ where: { concluded: true }, orderBy: { field: "id", direction: "asc" }, select: pieceProgressSelection })
			.pipe(Effect.orDie)).map((piece) => String(piece.id)),
	);
	const concludedVoyages = new Set(
		(yield* rows.voyageProgress
			.findMany({ where: { concluded: true }, orderBy: { field: "id", direction: "asc" }, select: voyageProgressSelection })
			.pipe(Effect.orDie)).map((voyage) => String(voyage.id)),
	);
	const gates = yield* rows.rulingGate
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: rulingGateSelection })
		.pipe(Effect.orDie);
	const speakers = Object.fromEntries(agents.map((agent) => [agent.id, agent.role]));
	const names = {
		agent: speakers,
		piece: Object.fromEntries(pieces.map((piece) => [piece.id, piece.title])),
		repo: Object.fromEntries(repos.map((repo) => [repo.id, repo.name])),
		voyage: Object.fromEntries(voyages.map((voyage) => [voyage.id, voyage.name])),
	};
	for (const ruling of yield* rows.ruling
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie)) {
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
		if (
			yield* writes.rulingDisplay.count({ where: { id: ruling.id } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)
		)
			yield* writes.rulingDisplay.updateVoid({ ...value, id: ruling.id }).pipe(Effect.orDie);
		else yield* writes.rulingDisplay.insertVoid(value).pipe(Effect.orDie);
	}
});
