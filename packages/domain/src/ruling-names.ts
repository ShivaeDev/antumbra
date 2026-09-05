import type { RulingAgentView, RulingSubjectView } from "@antumbra/contract";
import type { StoredAgent, StoredVoyage } from "@antumbra/persistence";
import type { Ruling, RulingSubject } from "@antumbra/rulings";
import { Option } from "effect";
import type { PieceRow, RepoRow } from "#voyage-rows.ts";

type ReferenceKind = Exclude<RulingSubjectView["kind"], "tag">;

export interface RulingNameRows {
	readonly agents: ReadonlyArray<StoredAgent>;
	readonly pieces: ReadonlyArray<PieceRow>;
	readonly repos: ReadonlyArray<RepoRow>;
	readonly voyages: ReadonlyArray<StoredVoyage>;
}

const NAME_OF: Readonly<Record<ReferenceKind, (world: RulingNameRows, id: string) => string | undefined>> = {
	agent: (world, id) => world.agents.find((row) => row.id === id)?.role,
	piece: (world, id) => world.pieces.find((row) => row.id === id)?.title,
	repo: (world, id) => world.repos.find((row) => row.id === id)?.name,
	voyage: (world, id) => world.voyages.find((row) => row.id === id)?.name,
};

export const subjectSeen = (world: RulingNameRows, subject: RulingSubject): RulingSubjectView =>
	subject.kind === "tag"
		? { id: subject.tag, kind: "tag", label: subject.tag }
		: { id: subject.id, kind: subject.kind, label: NAME_OF[subject.kind](world, subject.id) ?? subject.id };

export const agentSeen = (world: RulingNameRows, agentId: string): RulingAgentView => ({
	id: agentId,
	role: NAME_OF.agent(world, agentId) ?? "agent",
});

export const speakerSeen = (world: RulingNameRows, agentId: Option.Option<string>): RulingAgentView | null =>
	Option.getOrNull(Option.map(agentId, (id) => agentSeen(world, id)));

const subjectIds = (rulings: ReadonlyArray<Ruling>, kind: ReferenceKind): ReadonlyArray<string> =>
	rulings.flatMap((ruling) => ruling.subjects.flatMap((subject) => (subject.kind === kind ? [subject.id] : [])));

const speakerIds = (rulings: ReadonlyArray<Ruling>): ReadonlyArray<string> =>
	rulings.flatMap((ruling) => [
		...(ruling.requester.kind === "agent" ? [ruling.requester.agentId] : []),
		...ruling.contexts.flatMap((context) => Option.toArray(context.authorAgentId)),
		...ruling.reclassifications.flatMap((move) => Option.toArray(move.byAgentId)),
		...Option.toArray(Option.flatMap(ruling.answer, (answer) => answer.byAgentId)),
	]);

export const namedIds = (rulings: ReadonlyArray<Ruling>) => ({
	agents: [...speakerIds(rulings), ...subjectIds(rulings, "agent")],
	pieces: subjectIds(rulings, "piece"),
	repos: subjectIds(rulings, "repo"),
	voyages: subjectIds(rulings, "voyage"),
});
