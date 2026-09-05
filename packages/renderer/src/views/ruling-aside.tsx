import type { RulingView } from "@antumbra/contract";
import { useState } from "react";
import { askMoreOnRuling, parkRuling } from "#adapters/trpc-rulings.ts";
import { Button } from "#components/ui/button.tsx";
import { Input } from "#components/ui/input.tsx";
import { LabelledField } from "#views/field.tsx";
import { type RulingAct, RulingActs } from "#views/ruling-acts.tsx";
import { RulingReclassify } from "#views/ruling-reclassify.tsx";

const Note = ({
	act,
	label,
	onError,
	rulingId,
	words,
}: {
	readonly act: (request: { readonly note: string; readonly rulingId: string }, onError: (message: string) => void) => void;
	readonly label: string;
	readonly onError: (message: string) => void;
	readonly rulingId: string;
	readonly words: string;
}) => {
	const [note, setNote] = useState("");
	const wordless = note.trim() === "";
	return (
		<div className="flex min-w-0 flex-1 items-end gap-2">
			<div className="min-w-32 flex-1">
				<LabelledField label={label}>{(id) => <Input id={id} onChange={(event) => setNote(event.target.value)} value={note} />}</LabelledField>
			</div>
			<Button
				disabled={wordless}
				onClick={() => {
					act({ note: note.trim(), rulingId }, onError);
					setNote("");
				}}
				size="sm"
				type="button"
				variant="outline"
			>
				{words}
			</Button>
		</div>
	);
};

const asideActs = (onError: (message: string) => void, ruling: RulingView): ReadonlyArray<RulingAct> => [
	{
		act: <Note act={askMoreOnRuling} label="What do you need from them?" onError={onError} rulingId={ruling.id} words="Ask more" />,
		words: "Ask them for more",
	},
	...(ruling.parked === null
		? [
				{
					act: <Note act={parkRuling} label="Why not now?" onError={onError} rulingId={ruling.id} words="Not now" />,
					words: "Leave it for later",
				},
			]
		: []),
	{ act: <RulingReclassify onError={onError} ruling={ruling} />, words: "Change radius or urgency" },
];

export const RulingAside = ({ onError, ruling }: { readonly onError: (message: string) => void; readonly ruling: RulingView }) => (
	<RulingActs acts={asideActs(onError, ruling)} />
);
