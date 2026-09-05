import type { PieceView } from "@antumbra/contract";
import { useStore } from "@tanstack/react-form";
import { useFieldContext } from "#forms/context.ts";
import { Field } from "#forms/fields.tsx";

export const PiecePicker = ({ exclude, pieces }: { readonly exclude?: string; readonly pieces: ReadonlyArray<PieceView> }) => {
	const field = useFieldContext<ReadonlyArray<string>>();
	const state = useStore(field.store);
	const offered = pieces.filter((piece) => piece.id !== exclude);
	const options = offered.map((piece) => (
		<option key={piece.id} value={piece.id}>
			{piece.title}
		</option>
	));
	return (
		<Field label="Depends on">
			{(id) =>
				offered.length === 0 ? (
					<p className="text-2xs text-muted-foreground">Nothing else is chartered to depend on</p>
				) : (
					<select
						className="w-full min-w-0 rounded-md border border-border bg-input p-1 text-xs text-foreground outline-none transition-colors focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40"
						id={id}
						name={field.name}
						multiple
						onBlur={field.handleBlur}
						onChange={(event) => field.handleChange([...event.target.selectedOptions].map((option) => option.value))}
						size={Math.min(offered.length, 4)}
						value={[...state.value]}
						aria-invalid={state.meta.isTouched && !state.meta.isValid}
						aria-describedby={`${id}-error`}
					>
						{options}
					</select>
				)
			}
		</Field>
	);
};
