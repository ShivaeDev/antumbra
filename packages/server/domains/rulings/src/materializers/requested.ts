import { rulingGateId } from "@antumbra/domain-pieces/ids.ts";
import { pieceRulingGate } from "@antumbra/domain-pieces/rows/piece-ruling-gate.ts";
import { RepoId, repoReferenceId } from "@antumbra/domain-repos/ids.ts";
import { repoReference } from "@antumbra/domain-repos/rows/repo-reference.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import type { WriteHandles } from "@antumbra/platform-feature/handles.ts";
import { Effect } from "effect";
import type { rulingRequested } from "#facts/ruling-requested.ts";
import { choiceId } from "#ids.ts";
import { rulingGate } from "#rows/gate.ts";
import { ruling } from "#rows/ruling.ts";
export const requestWrites = [ruling, rulingGate, pieceRulingGate, repoReference] as const;
export const writeRequested = Effect.fn("rulings.writeRequested")(function* (
	fact: FactValue<typeof rulingRequested>,
	rows: WriteHandles<typeof requestWrites>,
) {
	const at = new Date(fact.at).toISOString();
	const offered = fact.choices.length === 0 && fact.recommendation !== null ? [{ label: fact.recommendation.choice }] : fact.choices;
	const choices = offered.map((choice, position) => ({
		id: choiceId(fact.id, position),
		position,
		label: choice.label,
		detail: "detail" in choice ? (choice.detail ?? null) : null,
	}));
	const recommended = choices.find((choice) => choice.label === fact.recommendation?.choice);
	yield* rows.ruling.insert({
		id: fact.id,
		requester: fact.requester,
		question: fact.question,
		context: fact.context,
		declaredRadius: fact.radius,
		declaredUrgency: fact.urgency,
		radius: fact.radius,
		urgency: fact.urgency,
		rung: fact.rung,
		choices,
		subjects: fact.subjects,
		contexts: [],
		reclassifications: [],
		recommendation:
			fact.recommendation !== null && recommended !== undefined ? { choiceId: recommended.id, reasoning: fact.recommendation.reasoning } : null,
		answer: null,
		parked: null,
		supersession: null,
		withdrawal: null,
		deliveredAt: null,
		createdAt: at,
	});
	for (const pieceId of new Set(fact.gates)) {
		const id = rulingGateId(fact.id, pieceId);
		yield* rows.rulingGate.insert({ id, rulingId: fact.id, pieceId, question: fact.question, open: true });
		yield* rows.pieceRulingGate.insert({ id, rulingId: fact.id, pieceId });
	}
	const repos = new Set(fact.subjects.flatMap((subject) => (subject.kind === "repo" ? [subject.id] : [])));
	for (const raw of repos) {
		const repoId = RepoId.make(raw);
		yield* rows.repoReference.insert({ id: repoReferenceId(fact.id, repoId), repoId });
	}
});
