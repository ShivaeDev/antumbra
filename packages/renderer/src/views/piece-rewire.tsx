import type { PieceView } from "@antumbra/contract";
import { Schema } from "effect";
import { useRequestForm } from "#adapters/form.ts";
import { rewirePiece } from "#adapters/trpc-voyages.ts";
import { RequestForm } from "#forms/view.tsx";
import { PiecePicker } from "#views/piece-picker.tsx";

const schema = Schema.Struct({ dependsOn: Schema.Array(Schema.String) });

export const PieceRewire = ({
	piece,
	pieces,
	onSaved,
}: {
	readonly piece: PieceView;
	readonly pieces: ReadonlyArray<PieceView>;
	readonly onSaved: () => void;
}) => {
	const form = useRequestForm({
		defaultValues: { dependsOn: piece.dependsOn },
		schema,
		request: (value) => rewirePiece({ ...value, pieceId: piece.id }),
		resetAfterSuccess: (value) => value,
		onSuccess: onSaved,
	});
	return (
		<div className="rounded-md border border-border bg-muted p-2">
			<RequestForm form={form}>
				<form.AppField name="dependsOn">{() => <PiecePicker exclude={piece.id} pieces={pieces} />}</form.AppField>
				<form.Submit className="self-start" pending="Saving…" size="sm">
					Save position
				</form.Submit>
			</RequestForm>
		</div>
	);
};
