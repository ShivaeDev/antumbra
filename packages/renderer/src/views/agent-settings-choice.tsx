import { useId } from "react";
import { Input } from "#components/ui/input.tsx";
import { effortsFor, type ModelCatalog } from "#hooks/backend-models.ts";
import { LabelledField } from "#views/field.tsx";

export const AgentSettingsChoice = ({
	catalog,
	effort,
	label,
	model,
	onChange,
}: {
	readonly catalog: ModelCatalog;
	readonly effort: string;
	readonly label: string;
	readonly model: string;
	readonly onChange: (chosen: { readonly effort: string; readonly model: string }) => void;
}) => {
	const models = useId();
	const efforts = useId();
	return (
		<div className="flex min-w-0 flex-wrap items-end gap-2">
			<div className="min-w-40 flex-1">
				<LabelledField label={`${label} model`}>
					{(id) => (
						<Input
							id={id}
							list={models}
							onChange={(event) => onChange({ effort, model: event.target.value })}
							placeholder="the backend's own"
							value={model}
						/>
					)}
				</LabelledField>
				<datalist id={models}>
					{catalog.choices.map((choice) => (
						<option key={choice.id} value={choice.id}>
							{choice.name}
						</option>
					))}
				</datalist>
			</div>
			<div className="min-w-24">
				<LabelledField label={`${label} effort`}>
					{(id) => (
						<Input
							id={id}
							list={efforts}
							onChange={(event) => onChange({ effort: event.target.value, model })}
							placeholder="the backend's own"
							value={effort}
						/>
					)}
				</LabelledField>
				<datalist id={efforts}>
					{effortsFor(catalog, model).map((offered) => (
						<option key={offered} value={offered} />
					))}
				</datalist>
			</div>
			{catalog.failure === null ? null : (
				<p className="w-full text-2xs text-destructive">{`${label} models could not be listed: ${catalog.failure}. Name one yourself.`}</p>
			)}
		</div>
	);
};
