import type { ReclassifyRequest, RulingView } from "@antumbra/contract";
import { Schema } from "effect";
import { useRequestForm } from "#adapters/form.ts";
import { reclassifyRuling } from "#adapters/trpc-rulings.ts";
import { RequestForm } from "#forms/view.tsx";
import { axisSchema, RulingAxisFields } from "#views/ruling-axis-fields.tsx";

const draftSchema = Schema.Struct({ ...axisSchema.fields, note: Schema.String });

const requestOf = (ruling: RulingView, radius: RulingView["radius"], urgency: RulingView["urgency"], note: string): ReclassifyRequest => ({
	rulingId: ruling.id,
	...(note.trim() === "" ? {} : { note: note.trim() }),
	...(radius === ruling.radius ? {} : { radius }),
	...(urgency === ruling.urgency ? {} : { urgency }),
});

export const RulingReclassify = ({ ruling }: { readonly ruling: RulingView }) => {
	const form = useRequestForm({
		defaultValues: { radius: ruling.radius, urgency: ruling.urgency, note: "" },
		schema: draftSchema.check(
			Schema.makeFilter((value) => (value.radius === ruling.radius && value.urgency === ruling.urgency ? "Change radius or urgency" : undefined)),
		),
		request: ({ radius, urgency, note }) => reclassifyRuling(requestOf(ruling, radius, urgency, note)),
		resetAfterSuccess: (value) => value,
		onSuccess: () => undefined,
	});
	return (
		<RequestForm form={form}>
			<div className="flex min-w-0 flex-wrap items-end gap-2">
				<RulingAxisFields form={form} fields={{ radius: "radius", urgency: "urgency" }} />
				<div className="min-w-32 flex-1">
					<form.AppField name="note">{(field) => <field.TextField label="Why" />}</form.AppField>
				</div>
				<form.Subscribe selector={(state) => state.values.radius === ruling.radius && state.values.urgency === ruling.urgency}>
					{(unmoved) => (
						<form.Submit disabled={unmoved} pending="Reclassifying…" size="sm" variant="outline">
							Reclassify
						</form.Submit>
					)}
				</form.Subscribe>
			</div>
		</RequestForm>
	);
};
