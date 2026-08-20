import type { PieceView } from "@antumbra/contract";
import { Input } from "#components/ui/input.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import { LabelledField } from "#views/field.tsx";
import { PiecePicker, pickable } from "#views/piece-picker.tsx";

export interface PieceDraft {
	readonly charter: string;
	readonly dependsOn: ReadonlyArray<string>;
	readonly expectation: string;
	readonly role: string;
	readonly title: string;
}

export const emptyPiece: PieceDraft = {
	charter: "",
	dependsOn: [],
	expectation: "",
	role: "",
	title: "",
};

export const PieceFields = ({
	draft,
	onChange,
	pieces,
}: {
	readonly draft: PieceDraft;
	readonly onChange: (draft: PieceDraft) => void;
	readonly pieces: ReadonlyArray<PieceView>;
}) => (
	<div className="flex min-w-0 flex-col gap-3">
		<LabelledField label="Title">
			{(id) => (
				<Input
					id={id}
					onChange={(event) =>
						onChange({ ...draft, title: event.target.value })
					}
					value={draft.title}
				/>
			)}
		</LabelledField>
		<LabelledField label="Charter">
			{(id) => (
				<Textarea
					id={id}
					onChange={(event) =>
						onChange({ ...draft, charter: event.target.value })
					}
					rows={3}
					value={draft.charter}
				/>
			)}
		</LabelledField>
		<LabelledField label="Expected outcome">
			{(id) => (
				<Input
					id={id}
					onChange={(event) =>
						onChange({ ...draft, expectation: event.target.value })
					}
					value={draft.expectation}
				/>
			)}
		</LabelledField>
		<LabelledField label="Role">
			{(id) => (
				<Input
					id={id}
					onChange={(event) => onChange({ ...draft, role: event.target.value })}
					value={draft.role}
				/>
			)}
		</LabelledField>
		<LabelledField label="Depends on">
			{(id) => (
				<PiecePicker
					chosen={draft.dependsOn}
					id={id}
					onChange={(dependsOn) => onChange({ ...draft, dependsOn })}
					pieces={pickable(pieces)}
				/>
			)}
		</LabelledField>
	</div>
);
