import type { QuayPiece } from "@antumbra/contract";
import { Schema } from "effect";
import { useRequestForm } from "#adapters/form.ts";
import { adoptChange } from "#adapters/trpc-quay.ts";
import { DialogFooter } from "#components/ui/dialog-sections.tsx";
import { RequestForm } from "#forms/view.tsx";

const draftSchema = Schema.Struct({ pieceId: Schema.NonEmptyString, repoName: Schema.NonEmptyString, url: Schema.NonEmptyString });
const defaultValues = { pieceId: "", repoName: "", url: "" };

export const AdoptChangeForm = ({ onAdopted, pieces }: { readonly onAdopted: () => void; readonly pieces: ReadonlyArray<QuayPiece> }) => {
	const form = useRequestForm({
		defaultValues,
		schema: draftSchema,
		request: adoptChange,
		resetAfterSuccess: (value) => ({ ...value, url: "" }),
		onSuccess: onAdopted,
	});
	const choices = pieces.filter((piece, index) => pieces.findIndex((other) => other.id === piece.id) === index);
	if (choices.length === 0)
		return (
			<p className="text-xs text-muted-foreground">
				No piece is chartered yet — a change is adopted onto the piece that owes it, so charter one first
			</p>
		);
	return (
		<RequestForm form={form}>
			<form.AppField name="pieceId">
				{(field) => (
					<field.SelectField
						label="Piece"
						placeholder="Choose a piece"
						choices={choices.map((piece) => ({ value: piece.id, label: `${piece.voyageName} › ${piece.title}` }))}
					/>
				)}
			</form.AppField>
			<form.AppField name="repoName">{(field) => <field.TextField label="Repository" placeholder="shoals" />}</form.AppField>
			<form.AppField name="url">{(field) => <field.TextField label="Address" placeholder="https://…" />}</form.AppField>
			<DialogFooter>
				<form.Submit pending="Adopting…">Adopt</form.Submit>
			</DialogFooter>
		</RequestForm>
	);
};
