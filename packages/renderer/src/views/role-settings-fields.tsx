import { defaultModelId, effortsFor, useBackendModels } from "#hooks/backend-models.ts";
import { EMPTY_DRAFT, type RoleDraft, type RoleField, type RolePlaceholder } from "#views/role-settings.ts";
import { BackendCell, SuggestedCell } from "#views/role-settings-cells.tsx";

const heading = "text-left text-2xs font-normal text-muted-foreground";

const RoleRow = ({
	backends,
	draft,
	inheritLabel,
	label,
	onChange,
	placeholder,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly draft: RoleDraft;
	readonly inheritLabel: string | null;
	readonly label: string;
	readonly onChange: (draft: RoleDraft) => void;
	readonly placeholder: RolePlaceholder;
}) => {
	const catalog = useBackendModels(draft.backend === "" ? placeholder.backend : draft.backend);
	const named = effortsFor(catalog, draft.model === "" ? placeholder.model : draft.model);
	const offered = named.length === 0 ? effortsFor(catalog, defaultModelId(catalog)) : named;
	return (
		<>
			<tr>
				<th className="pr-2 text-left text-xs font-normal" scope="row">
					{label}
				</th>
				<BackendCell
					backends={backends}
					chosen={draft.backend}
					inheritLabel={inheritLabel}
					label={label}
					onChange={(backend) => onChange({ ...draft, backend })}
					placeholder={placeholder.backend}
				/>
				<SuggestedCell
					label={`${label} model`}
					onChange={(model) => onChange({ ...draft, model })}
					placeholder={placeholder.model}
					suggestions={catalog.choices.map((choice) => ({ label: choice.name, value: choice.id }))}
					value={draft.model}
				/>
				<SuggestedCell
					label={`${label} effort`}
					onChange={(effort) => onChange({ ...draft, effort })}
					placeholder={placeholder.effort}
					suggestions={offered.map((effort) => ({ label: "", value: effort }))}
					value={draft.effort}
				/>
			</tr>
			{catalog.failure === null ? null : (
				<tr>
					<td className="text-2xs text-destructive" colSpan={4}>{`${label} models could not be listed: ${catalog.failure}. Name one yourself.`}</td>
				</tr>
			)}
		</>
	);
};

export const RoleSettingsFields = ({
	backends,
	drafts,
	inheritLabel,
	lines,
	onChange,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly drafts: Readonly<Record<string, RoleDraft>>;
	readonly inheritLabel: string | null;
	readonly lines: ReadonlyArray<RoleField<string>>;
	readonly onChange: (role: string, draft: RoleDraft) => void;
}) => (
	<table className="w-full border-separate border-spacing-x-0 border-spacing-y-1">
		<thead>
			<tr>
				<th className="w-0 p-0" scope="col">
					<span className="sr-only">Role</span>
				</th>
				<th className={`w-28 ${heading}`} scope="col">
					Backend
				</th>
				<th className={`pl-2 ${heading}`} scope="col">
					Model
				</th>
				<th className={`w-24 pl-2 ${heading}`} scope="col">
					Effort
				</th>
			</tr>
		</thead>
		<tbody>
			{lines.map((line) => (
				<RoleRow
					backends={backends}
					draft={drafts[line.role] ?? EMPTY_DRAFT}
					inheritLabel={inheritLabel}
					key={line.role}
					label={line.label}
					onChange={(draft) => onChange(line.role, draft)}
					placeholder={line.placeholder}
				/>
			))}
			{backends.length === 0 ? (
				<tr>
					<td className="text-2xs text-muted-foreground" colSpan={4}>
						No backend is registered.
					</td>
				</tr>
			) : null}
		</tbody>
	</table>
);
