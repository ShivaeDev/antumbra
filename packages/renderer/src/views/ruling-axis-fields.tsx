import { RulingView } from "@antumbra/contract";
import { Schema } from "effect";
import { withFieldGroup } from "#forms/hook.ts";
import { rulingRadii, rulingUrgencies } from "#rulings/labels.ts";

export const axisSchema = Schema.Struct({ radius: RulingView.fields.radius, urgency: RulingView.fields.urgency });
export const defaultAxes: typeof axisSchema.Type = { radius: "fleet", urgency: "eventual" };
const selectClass =
	"h-7 w-full min-w-0 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40";

const radiusOptions = rulingRadii.map((word) => (
	<option key={word} value={word}>
		{word}
	</option>
));

const urgencyOptions = rulingUrgencies.map((word) => (
	<option key={word} value={word}>
		{word}
	</option>
));

export const RulingAxisFields = withFieldGroup({
	defaultValues: defaultAxes,
	render: ({ group }) => (
		<>
			<group.AppField name="radius">
				{(field) => (
					<field.NativeSelectField label="Radius" className={selectClass}>
						{radiusOptions}
					</field.NativeSelectField>
				)}
			</group.AppField>
			<group.AppField name="urgency">
				{(field) => (
					<field.NativeSelectField label="Urgency" className={selectClass}>
						{urgencyOptions}
					</field.NativeSelectField>
				)}
			</group.AppField>
		</>
	),
});
