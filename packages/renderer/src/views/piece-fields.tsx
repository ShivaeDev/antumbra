import type { PieceView } from "@antumbra/contract";
import { Schema } from "effect";
import { withFieldGroup } from "#forms/hook.ts";
import { PiecePicker, pickable } from "#views/piece-picker.tsx";

export const pieceDraftSchema = Schema.Struct({
	charter: Schema.NonEmptyString,
	dependsOn: Schema.Array(Schema.String),
	expectation: Schema.String,
	role: Schema.NonEmptyString,
	title: Schema.NonEmptyString,
});

export const emptyPiece: typeof pieceDraftSchema.Type = { charter: "", dependsOn: [], expectation: "", role: "", title: "" };

const noPieces: ReadonlyArray<PieceView> = [];

export const PieceFields = withFieldGroup({
	defaultValues: emptyPiece,
	props: { pieces: noPieces },
	render: ({ group: form, pieces }) => (
		<>
			<form.AppField name="title">{(field) => <field.TextField label="Title" />}</form.AppField>
			<form.AppField name="charter">{(field) => <field.TextareaField label="Charter" />}</form.AppField>
			<form.AppField name="expectation">{(field) => <field.TextField label="Expected outcome" />}</form.AppField>
			<form.AppField name="role">{(field) => <field.TextField label="Role" />}</form.AppField>
			<form.AppField name="dependsOn">
				{(field) => (
					<field.Field label="Depends on">
						{(id) => <PiecePicker chosen={field.state.value} id={id} onChange={field.handleChange} pieces={pickable(pieces)} />}
					</field.Field>
				)}
			</form.AppField>
		</>
	),
});
