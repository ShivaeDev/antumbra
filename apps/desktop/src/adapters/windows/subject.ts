import type { WindowPlace } from "@antumbra/contract";

export const subjectOf = (place: WindowPlace): string => {
	if (place.role === "console") {
		return "console";
	}
	return place.role === "artifact" ? `artifact:${place.artifactId}` : `transcript:${place.sessionId}`;
};

export const sameSubject = (held: WindowPlace, wanted: WindowPlace): boolean => subjectOf(held) === subjectOf(wanted);
