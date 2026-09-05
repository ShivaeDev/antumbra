import { useStore } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { withFieldGroup } from "#forms/hook.ts";
import { defaultModelId, effortsFor, emptyCatalog, type ModelCatalog } from "#hooks/backend-models.ts";
import { EMPTY_DRAFT, EMPTY_PLACEHOLDER, type RolePlaceholder } from "#views/role-settings.ts";

const FLEET_DEFAULT = "@fleet-default";

const roleProps: {
	readonly backends: ReadonlyArray<string>;
	readonly catalog: ModelCatalog;
	readonly inheritLabel: string | null;
	readonly label: string;
	readonly placeholder: RolePlaceholder;
} = { backends: [], catalog: emptyCatalog, inheritLabel: null, label: "", placeholder: EMPTY_PLACEHOLDER };

export const RoleFields = withFieldGroup({
	defaultValues: EMPTY_DRAFT,
	props: roleProps,
	render: ({ group, backends, catalog, inheritLabel, label, placeholder }) => {
		const model = useStore(group.store, (state) => state.values.model);
		const inherit = inheritLabel === null ? [] : [{ label: inheritLabel, value: FLEET_DEFAULT }];
		const named = effortsFor(catalog, model === "" ? placeholder.model : model);
		const offered = named.length === 0 ? effortsFor(catalog, defaultModelId(catalog)) : named;
		return (
			<>
				<span className="text-xs">{label}</span>
				<group.AppField
					name="backend"
					listeners={{
						onChange: ({ value }) => {
							if (value === FLEET_DEFAULT) group.setFieldValue("backend", "");
							group.setFieldValue("model", "");
							group.setFieldValue("effort", "");
						},
					}}
				>
					{(field) => (
						<field.SelectField
							aria-label={`${label} backend`}
							choices={[...inherit, ...backends.map((tag) => ({ label: tag, value: tag }))]}
							disabled={backends.length === 0}
							label={<span className="sr-only">{`${label} backend`}</span>}
							placeholder={placeholder.backend}
						/>
					)}
				</group.AppField>
				<group.AppField name="model">
					{(field) => (
						<field.DatalistField
							aria-label={`${label} model`}
							choices={catalog.choices.map((choice) => ({ label: choice.name, value: choice.id }))}
							label={<span className="sr-only">{`${label} model`}</span>}
							placeholder={placeholder.model}
						/>
					)}
				</group.AppField>
				<group.AppField name="effort">
					{(field) => (
						<field.DatalistField
							aria-label={`${label} effort`}
							choices={offered.map((effort) => ({ label: effort, value: effort }))}
							label={<span className="sr-only">{`${label} effort`}</span>}
							placeholder={placeholder.effort}
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

export const RoleGrid = ({ backends, children }: { readonly backends: ReadonlyArray<string>; readonly children: ReactNode }) => (
	<div className="grid min-w-0 grid-cols-[auto_7rem_1fr_6rem] items-center gap-x-2 gap-y-1">
		<span />
		<span className="text-2xs text-muted-foreground">Backend</span>
		<span className="text-2xs text-muted-foreground">Model</span>
		<span className="text-2xs text-muted-foreground">Effort</span>
		{children}
		{backends.length === 0 ? <p className="col-span-full text-2xs text-muted-foreground">No backend is registered.</p> : null}
	</div>
);
