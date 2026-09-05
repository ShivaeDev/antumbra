import type { AskMoreRequest } from "@antumbra/contract";
import { type Effect, Schema } from "effect";
import { useRequestForm } from "#adapters/form.ts";
import type { RendererRequestError } from "#adapters/request-error.ts";
import { RequestForm } from "#forms/view.tsx";

const noteSchema = Schema.Struct({ note: Schema.String.check(Schema.isPattern(/\S/)) });
const emptyNote = { note: "" };

export const RulingNoteForm = ({
	request,
	label,
	rulingId,
	words,
	pending,
}: {
	readonly request: (request: AskMoreRequest) => Effect.Effect<void, RendererRequestError>;
	readonly label: string;
	readonly rulingId: string;
	readonly words: string;
	readonly pending: string;
}) => {
	const form = useRequestForm({
		defaultValues: emptyNote,
		schema: noteSchema,
		request: ({ note }) => request({ note: note.trim(), rulingId }),
		resetAfterSuccess: () => emptyNote,
		onSuccess: () => undefined,
	});
	return (
		<RequestForm form={form}>
			<div className="flex min-w-0 items-end gap-2">
				<div className="min-w-0 flex-1">
					<form.AppField name="note">{(field) => <field.TextField label={label} />}</form.AppField>
				</div>
				<form.Subscribe selector={(state) => state.values.note.trim() === ""}>
					{(wordless) => (
						<form.Submit disabled={wordless} pending={pending} size="sm" variant="outline">
							{words}
						</form.Submit>
					)}
				</form.Subscribe>
			</div>
		</RequestForm>
	);
};
