import { useStore } from "@tanstack/react-form";
import { withFieldGroup } from "#forms/hook.ts";
import { effortsFor, emptyCatalog, type ModelCatalog } from "#hooks/backend-models.ts";

const props: { readonly catalog: ModelCatalog; readonly label: string; readonly labelClassName?: string; readonly placeholder: string } = {
	catalog: emptyCatalog,
	label: "",
	placeholder: "the backend's own",
};

export const AgentSettingsChoice = withFieldGroup({
	defaultValues: { model: "", effort: "" },
	props,
	render: ({ group, catalog, label, labelClassName, placeholder }) => {
		const model = useStore(group.store, (state) => state.values.model);
		const models = catalog.choices.map((choice) => ({ value: choice.id, label: choice.name }));
		const efforts = effortsFor(catalog, model).map((offered) => ({ value: offered, label: offered }));
		return (
			<>
				<group.AppField name="model">
					{(field) => (
						<field.DatalistField
							label={<span className={labelClassName}>{`${label} model`}</span>}
							aria-label={`${label} model`}
							choices={models}
							placeholder={placeholder}
						/>
					)}
				</group.AppField>
				<group.AppField name="effort">
					{(field) => (
						<field.DatalistField
							label={<span className={labelClassName}>{`${label} effort`}</span>}
							aria-label={`${label} effort`}
							choices={efforts}
							placeholder={placeholder}
						/>
					)}
				</group.AppField>
				{catalog.failure === null ? null : (
					<p className="col-span-full w-full text-2xs text-destructive">{`${label} models could not be listed: ${catalog.failure}. Name one yourself.`}</p>
				)}
			</>
		);
	},
});
