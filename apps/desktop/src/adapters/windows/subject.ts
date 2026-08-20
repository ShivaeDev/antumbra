import type { WindowPlace } from "@antumbra/contract";

// why: a window is opened for one subject, so two places naming the same
// subject are one window asked for twice. The rule that refuses to mint a
// second window and the rule that refuses to reopen one twice from a file are
// the same rule, and there is one of it.
export const subjectOf = (place: WindowPlace): string =>
	place.role === "console" ? "console" : `${place.role}:${place.sessionId}`;

export const sameSubject = (held: WindowPlace, wanted: WindowPlace): boolean =>
	subjectOf(held) === subjectOf(wanted);
