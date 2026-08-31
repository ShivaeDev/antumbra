import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { RulingSubjectMissing } from "#errors.ts";
import type { RulingReferenceKind, RulingSubject } from "#model.ts";

const referenceExists = (kind: RulingReferenceKind, id: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const known = {
			agent: db.Agent.where({ id }).exists(),
			piece: db.Piece.where({ id }).exists(),
			repo: db.Repo.where({ id }).exists(),
			voyage: db.Voyage.where({ id }).exists(),
		};
		return yield* known[kind];
	});

export const verifySubject = (subject: RulingSubject) =>
	Effect.gen(function* () {
		if (subject.kind === "tag") {
			return;
		}
		if (!(yield* referenceExists(subject.kind, subject.id))) {
			return yield* new RulingSubjectMissing({ subject });
		}
	});

export const subjectColumns = (subject: RulingSubject) => ({
	agentId: subject.kind === "agent" ? subject.id : null,
	kind: subject.kind,
	pieceId: subject.kind === "piece" ? subject.id : null,
	repoId: subject.kind === "repo" ? subject.id : null,
	tag: subject.kind === "tag" ? subject.tag : null,
	voyageId: subject.kind === "voyage" ? subject.id : null,
});

export const subjectRow = (rulingId: string, subject: RulingSubject) => ({
	...subjectColumns(subject),
	id: crypto.randomUUID(),
	rulingId,
});
