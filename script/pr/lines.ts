import type { Note } from "#pr/notes.ts";

export type Line =
	| {
			readonly state: "behind" | "changes-requested" | "ci-green" | "closed" | "conflict" | "mergeable" | "merged" | "no-checks" | "superseded";
			readonly head: string;
	  }
	| { readonly state: "ci-failed"; readonly head: string; readonly checks: readonly string[]; readonly statuses: readonly string[] }
	| { readonly state: "gh-error"; readonly message: string; readonly minutes: number }
	| Note;

type Subject = { readonly repo: string; readonly number?: number };

export type Event = Line & Subject;

export const labelled = (subject: Subject, line: Line): Event => Object.assign({ state: line.state, repo: subject.repo }, subject, line);

export const render = (event: Event): string => JSON.stringify(event);
