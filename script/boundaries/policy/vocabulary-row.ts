import { files, importFrom, vocabularyAccess } from "#boundaries/dsl.ts";
import type { BoundaryRule, ImportSource } from "#boundaries/model.ts";
import { failPolicy } from "#boundaries/validation.ts";

const subjectFile: Record<string, string> = {
	"agent-runtime": "src/agent-runtime/stored.ts",
	board: "src/board.ts",
	change: "src/change.ts",
	ruling: "src/ruling.ts",
	"session-events": "src/session-events/events.ts",
	"session-input": "src/session-input.ts",
};

const probe = ["board", "change", "agent-runtime", "ruling", "session-events", "session-input"];

const vocabFile = (subject: string): string => {
	const file = subjectFile[subject];
	if (file === undefined) return failPolicy(`vocabulary row names unknown subject: ${subject}`);
	return file;
};

export const row = (
	name: string,
	rationale: string,
	consumers: ImportSource,
	fromPackage: string,
	fromFile: string,
	allowedSubjects: readonly [string, ...string[]],
): BoundaryRule => {
	const forbidden = probe.find((subject) => !allowedSubjects.includes(subject));
	if (forbidden === undefined) return failPolicy(`vocabulary row allows every probe subject: ${name}`);
	const from = files.inPackage(fromPackage, fromFile);
	const vocab = (subject: string) => files.inPackage("platform/vocabulary", vocabFile(subject));
	return vocabularyAccess(name)
		.because(rationale)
		.for(consumers)
		.allowsOnly(...allowedSubjects)
		.demonstratedBy({ illegal: importFrom(from).to(vocab(forbidden)), legal: importFrom(from).to(vocab(allowedSubjects[0])) });
};
