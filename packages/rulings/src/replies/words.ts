import type { Ruling } from "#model.ts";

export const questionBackWords = (ruling: Ruling, note: string): string =>
	[
		`The admiral asks about your request, and has not ruled: ${note}`,
		`You asked: ${ruling.question}`,
		`Answer with add_context, naming ruling ${ruling.id}.`,
	].join("\n");

export const notNowWords = (ruling: Ruling, note: string): string =>
	[
		`Not now: ${note}`,
		`You asked: ${ruling.question}`,
		`Ruling ${ruling.id} stays open and waits for a later moment. Work on what does not need the answer.`,
	].join("\n");
