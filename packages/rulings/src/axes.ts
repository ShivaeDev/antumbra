import { Option } from "effect";
import type { RulingAxes, RulingReclassification } from "#model.ts";

export const effectiveAxes = (declared: RulingAxes, reclassifications: ReadonlyArray<RulingReclassification>): RulingAxes =>
	reclassifications.reduce<RulingAxes>(
		(axes, reclassification) => ({
			radius: Option.getOrElse(reclassification.radius, () => axes.radius),
			urgency: Option.getOrElse(reclassification.urgency, () => axes.urgency),
		}),
		declared,
	);
