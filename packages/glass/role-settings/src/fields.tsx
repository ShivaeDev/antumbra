import { useField } from "@antumbra/atom-form/react.ts";
import type { AgentRole } from "@antumbra/vocabulary/agent-role.ts";
import { useId } from "react";
import { CONTROL, TEXT_CONTROL } from "#controls.ts";
import type { SettingsForm } from "#form.ts";
import { defaultModelId, effortsFor, modelsFor } from "#models.ts";
import { type BackendModels, fieldsOf, type RolePlaceholder } from "#shape.ts";

export const RoleFields = (props: {
	readonly backends: readonly BackendModels[];
	readonly form: SettingsForm;
	readonly inheritLabel: string | null;
	readonly label: string;
	readonly placeholder: RolePlaceholder;
	readonly role: AgentRole;
}) => {
	const names = fieldsOf[props.role];
	const backend = useField(props.form, names.backend);
	const model = useField(props.form, names.model);
	const effort = useField(props.form, names.effort);
	const modelList = useId();
	const effortList = useId();
	const catalog = modelsFor(props.backends, backend.value === "" ? props.placeholder.backend : backend.value);
	const named = effortsFor(catalog, model.value === "" ? props.placeholder.model : model.value);
	const offered = named.length === 0 ? effortsFor(catalog, defaultModelId(catalog)) : named;
	const sailOn = (tag: string): void => {
		backend.onChange(tag);
		model.onChange("");
		effort.onChange("");
	};
	return (
		<>
			<span className="text-xs">{props.label}</span>
			<select
				aria-label={`${props.label} backend`}
				className={CONTROL}
				disabled={props.backends.length === 0}
				onBlur={backend.onBlur}
				onChange={(event) => sailOn(event.target.value)}
				value={backend.value}
			>
				<option value="">{props.inheritLabel ?? props.placeholder.backend}</option>
				{props.backends.map((choice) => (
					<option key={choice.tag} value={choice.tag}>
						{choice.tag}
					</option>
				))}
			</select>
			<input
				aria-label={`${props.label} model`}
				className={TEXT_CONTROL}
				list={modelList}
				onBlur={model.onBlur}
				onChange={(event) => model.onChange(event.target.value)}
				placeholder={props.placeholder.model}
				value={model.value}
			/>
			<datalist id={modelList}>
				{catalog.models.map((choice) => (
					<option key={choice.id} value={choice.id}>
						{choice.name}
					</option>
				))}
			</datalist>
			<input
				aria-label={`${props.label} effort`}
				className={TEXT_CONTROL}
				list={effortList}
				onBlur={effort.onBlur}
				onChange={(event) => effort.onChange(event.target.value)}
				placeholder={props.placeholder.effort}
				value={effort.value}
			/>
			<datalist id={effortList}>
				{offered.map((choice) => (
					<option key={choice} value={choice} />
				))}
			</datalist>
			{catalog.failure === null ? null : (
				<p className="col-span-full w-full text-2xs text-destructive">{`${props.label} models could not be listed: ${catalog.failure}. Name one yourself.`}</p>
			)}
		</>
	);
};
