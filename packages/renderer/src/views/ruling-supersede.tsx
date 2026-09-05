import type { StandingRulingView } from "@antumbra/contract";
import { Schema } from "effect";
import { useRequestForm } from "#adapters/form.ts";
import { supersedeRuling } from "#adapters/trpc-rulings.ts";
import { RequestForm } from "#forms/view.tsx";

const successorSchema = Schema.Struct({ byRulingId: Schema.NonEmptyString });

export const RulingSupersede = ({ others, ruling }: { readonly others: ReadonlyArray<StandingRulingView>; readonly ruling: StandingRulingView }) => {
	const form = useRequestForm({
		defaultValues: { byRulingId: "" },
		schema: successorSchema,
		request: ({ byRulingId }) => supersedeRuling({ byRulingId, rulingId: ruling.id }),
		resetAfterSuccess: (value) => value,
		onSuccess: () => undefined,
	});
	if (others.length === 0) return null;
	const label = `Supersede "${ruling.question}" with`;
	const choices = others.map((other) => ({ value: other.id, label: other.question }));
	return (
		<RequestForm form={form}>
			<div className="flex min-w-0 items-end gap-2">
				<div className="min-w-0 flex-1">
					<form.AppField name="byRulingId">
						{(field) => <field.SelectField label="Supersede with…" aria-label={label} placeholder="A later standing ruling" choices={choices} />}
					</form.AppField>
				</div>
				<form.Subscribe selector={(state) => state.values.byRulingId === ""}>
					{(unchosen) => (
						<form.Submit disabled={unchosen} pending="Superseding…" size="sm" variant="outline">
							Supersede
						</form.Submit>
					)}
				</form.Subscribe>
			</div>
		</RequestForm>
	);
};
