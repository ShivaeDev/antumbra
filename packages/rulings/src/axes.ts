import { Option } from "effect";
import type { RulingAxes, RulingReclassification } from "#model.ts";

// why: the asker's word stays as written; what orders, scopes, and binds reads
// the latest word an authority set on each axis and falls back to it.
export const effectiveAxes = (declared: RulingAxes, reclassifications: ReadonlyArray<RulingReclassification>): RulingAxes =>
	reclassifications.reduce<RulingAxes>(
		(axes, reclassification) => ({
			radius: Option.getOrElse(reclassification.radius, () => axes.radius),
			urgency: Option.getOrElse(reclassification.urgency, () => axes.urgency),
		}),
		declared,
	);
