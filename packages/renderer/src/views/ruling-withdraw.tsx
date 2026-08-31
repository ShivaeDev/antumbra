import type { StandingRulingView } from "@antumbra/contract";
import { useState } from "react";
import { withdrawRuling } from "#adapters/trpc-rulings.ts";
import { Button } from "#components/ui/button.tsx";
import { Input } from "#components/ui/input.tsx";
import { LabelledField } from "#views/field.tsx";

export const RulingWithdraw = ({ onError, ruling }: { readonly onError: (message: string) => void; readonly ruling: StandingRulingView }) => {
	const [note, setNote] = useState("");
	const wordless = note.trim() === "";
	return (
		<div className="flex min-w-0 items-end gap-2 border-t border-border pt-2">
			<div className="min-w-0 flex-1">
				<LabelledField label="Withdraw because…">
					{(id) => <Input id={id} onChange={(event) => setNote(event.target.value)} value={note} />}
				</LabelledField>
			</div>
			<Button
				disabled={wordless}
				onClick={() => {
					withdrawRuling({ note: note.trim(), rulingId: ruling.id }, onError);
					setNote("");
				}}
				size="sm"
				type="button"
				variant="outline"
			>
				Withdraw
			</Button>
		</div>
	);
};
