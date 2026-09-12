import { rulingRadiusRank, rulingUrgencyRank } from "@antumbra/platform-vocabulary/ruling.ts";
import type { Ruling } from "#rows/ruling.ts";
export const openOrder = (a: Ruling, b: Ruling): number =>
	rulingUrgencyRank(a.urgency) - rulingUrgencyRank(b.urgency) ||
	rulingRadiusRank(a.radius) - rulingRadiusRank(b.radius) ||
	a.createdAt.localeCompare(b.createdAt);
export const matches = (ruling: Ruling, subjects: Ruling["subjects"]): boolean =>
	ruling.subjects.some((subject) =>
		subjects.some(
			(candidate) =>
				subject.kind === candidate.kind &&
				(subject.kind === "tag" && candidate.kind === "tag"
					? subject.tag === candidate.tag
					: subject.kind !== "tag" && candidate.kind !== "tag" && subject.id === candidate.id),
		),
	);
