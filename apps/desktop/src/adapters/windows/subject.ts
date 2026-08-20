import type { WindowPlace } from "@antumbra/contract";

// why: a window is opened for one subject, so two places naming the same
// subject are one window asked for twice. Every role names its subject here,
// so a role added to the union is refused a second window by having been
// taught to say what it is about, and nowhere else.
export const subjectOf = (place: WindowPlace): string => {
	if (place.role === "console") {
		return "console";
	}
	return place.role === "artifact"
		? `artifact:${place.artifactId}`
		: `transcript:${place.sessionId}`;
};

export const sameSubject = (held: WindowPlace, wanted: WindowPlace): boolean =>
	subjectOf(held) === subjectOf(wanted);
