import { Option } from "effect";
import { admiralAsks } from "#holds/admiral-asks.ts";
import type { RulingHeldEnd } from "#holds/held.ts";
import type { Ruling } from "#model.ts";

const askedSince = (ruling: Ruling, asksBefore: number): Option.Option<RulingHeldEnd> => {
	const asks = admiralAsks(ruling);
	const asked = asks.length > asksBefore ? asks.at(-1) : undefined;
	return asked === undefined ? Option.none() : Option.some({ _tag: "asked", note: asked.body, ruling });
};

export const heldEndOf = (ruling: Ruling, asksBefore: number): Option.Option<RulingHeldEnd> =>
	Option.match(ruling.answer, {
		onNone: () =>
			Option.orElse(askedSince(ruling, asksBefore), () =>
				Option.map(ruling.parked, (parked): RulingHeldEnd => ({ _tag: "parked", note: parked.note, ruling })),
			),
		onSome: (answer): Option.Option<RulingHeldEnd> => Option.some({ _tag: "ruled", answer, ruling }),
	});
