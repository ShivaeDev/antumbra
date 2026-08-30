import type { BoardEntryView, BoardTarget } from "@antumbra/contract";
import { useState } from "react";
import { writeBoard } from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import { LabelledField } from "#views/field.tsx";
import { boardRegisterLabel } from "#voyages/labels.ts";

type Register = BoardEntryView["register"];

const REGISTERS: ReadonlyArray<Register> = ["smooth", "rough"];

export const BoardComposer = ({ onError, scope }: { readonly onError: (message: string) => void; readonly scope: BoardTarget }) => {
	const [body, setBody] = useState("");
	const [register, setRegister] = useState<Register>("smooth");
	const write = () => writeBoard({ body, register, scope }, () => setBody(""), onError);
	return (
		<div className="flex min-w-0 flex-col gap-2">
			<LabelledField label="Write to the board">
				{(id) => <Textarea id={id} onChange={(event) => setBody(event.target.value)} rows={2} value={body} />}
			</LabelledField>
			<div className="flex min-w-0 flex-wrap items-center gap-2">
				<fieldset className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
					<legend className="sr-only">Register</legend>
					{REGISTERS.map((choice) => (
						<Button
							aria-pressed={register === choice}
							key={choice}
							onClick={() => setRegister(choice)}
							size="sm"
							type="button"
							variant={register === choice ? "secondary" : "ghost"}
						>
							{boardRegisterLabel[choice]}
						</Button>
					))}
				</fieldset>
				<Button className="ml-auto" disabled={body === ""} onClick={write} size="sm" type="button">
					Write
				</Button>
			</div>
		</div>
	);
};
