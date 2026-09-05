import type { RulingView } from "@antumbra/contract";
import { useState } from "react";
import { askMoreOnRuling, parkRuling } from "#adapters/trpc-rulings.ts";
import { Button } from "#components/ui/button.tsx";
import { Input } from "#components/ui/input.tsx";
import { LabelledField } from "#views/field.tsx";

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

export const RulingAside = ({ onError, ruling }: { readonly onError: (message: string) => void; readonly ruling: RulingView }) => (
	<div className="flex min-w-0 flex-wrap items-end gap-2 border-t border-border pt-2">
		<Note act={askMoreOnRuling} label="Ask them for more" onError={onError} rulingId={ruling.id} words="Ask more" />
		{ruling.parked === null ? (
			<Note act={parkRuling} label="Leave it for later because…" onError={onError} rulingId={ruling.id} words="Not now" />
		) : null}
	</div>
);
