import type { RulingAgentView, RulingSubjectView } from "@antumbra/contract";
import type { StoredAgent, StoredVoyage } from "@antumbra/persistence";
import type { Ruling, RulingSubject } from "@antumbra/rulings";
import { Option } from "effect";
import type { PieceRow, RepoRow } from "#voyage-rows.ts";

type ReferenceKind = Exclude<RulingSubjectView["kind"], "tag">;

export interface RulingNames {
	readonly agents: ReadonlyMap<string, StoredAgent>;
	readonly pieces: ReadonlyMap<string, PieceRow>;
	readonly repos: ReadonlyMap<string, RepoRow>;
	readonly voyages: ReadonlyMap<string, StoredVoyage>;
}

const NAME_OF: Readonly<Record<ReferenceKind, (world: RulingNames, id: string) => string | undefined>> = {
	agent: (world, id) => world.agents.get(id)?.role,
	piece: (world, id) => world.pieces.get(id)?.title,
	repo: (world, id) => world.repos.get(id)?.name,
	voyage: (world, id) => world.voyages.get(id)?.name,
};

export const subjectSeen = (world: RulingNames, subject: RulingSubject): RulingSubjectView =>
	subject.kind === "tag"
		? { id: subject.tag, kind: "tag", label: subject.tag }
		: { id: subject.id, kind: subject.kind, label: NAME_OF[subject.kind](world, subject.id) ?? subject.id };

export const agentSeen = (world: RulingNames, agentId: string): RulingAgentView => ({
	id: agentId,
	role: NAME_OF.agent(world, agentId) ?? "agent",
});

export const speakerSeen = (world: RulingNames, agentId: Option.Option<string>): RulingAgentView | null =>
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
