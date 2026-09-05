import type { RulingView } from "@antumbra/contract";
import { askMoreOnRuling, parkRuling } from "#adapters/trpc-rulings.ts";
import { type RulingAct, RulingActs } from "#views/ruling-acts.tsx";
import { RulingNoteForm } from "#views/ruling-note-form.tsx";
import { RulingReclassify } from "#views/ruling-reclassify.tsx";

const asideActs = (ruling: RulingView): ReadonlyArray<RulingAct> => [
	{
		act: <RulingNoteForm request={askMoreOnRuling} label="What do you need from them?" rulingId={ruling.id} words="Ask more" pending="Asking…" />,
		words: "Ask them for more",
	},
	...(ruling.parked === null
		? [
				{
					act: <RulingNoteForm request={parkRuling} label="Why not now?" rulingId={ruling.id} words="Not now" pending="Parking…" />,
					words: "Leave it for later",
				},
			]
		: []),
	{ act: <RulingReclassify ruling={ruling} />, words: "Change radius or urgency" },
];

export const RulingAside = ({ ruling }: { readonly ruling: RulingView }) => <RulingActs acts={asideActs(ruling)} />;
