import type { PieceView } from "@antumbra/contract";
import { Input } from "#components/ui/input.tsx";
import { FormField, textAreaClass } from "#views/form-field.tsx";
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
		<FormField label="Title">
			{(id) => (
				<Input
					id={id}
					onChange={(event) =>
						onChange({ ...draft, title: event.target.value })
					}
					value={draft.title}
				/>
			)}
		</FormField>
		<FormField label="Charter">
			{(id) => (
				<textarea
					className={textAreaClass}
					id={id}
					onChange={(event) =>
						onChange({ ...draft, charter: event.target.value })
					}
					rows={3}
					value={draft.charter}
				/>
			)}
		</FormField>
		<FormField label="Expected outcome">
			{(id) => (
				<Input
					id={id}
					onChange={(event) =>
						onChange({ ...draft, expectation: event.target.value })
					}
					value={draft.expectation}
				/>
			)}
		</FormField>
		<FormField label="Role">
			{(id) => (
				<Input
					id={id}
					onChange={(event) => onChange({ ...draft, role: event.target.value })}
					value={draft.role}
				/>
			)}
		</FormField>
		<FormField label="Depends on">
			{(id) => (
				<PiecePicker
					chosen={draft.dependsOn}
					id={id}
					onChange={(dependsOn) => onChange({ ...draft, dependsOn })}
					pieces={pickable(pieces)}
				/>
			)}
		</FormField>
	</div>
);
