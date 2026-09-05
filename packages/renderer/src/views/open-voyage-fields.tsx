import { type RoleSettings, VOYAGE_AGENT_ROLES, type VoyageAgentRole } from "@antumbra/contract";
import { Input } from "#components/ui/input.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import { LabelledField } from "#views/field.tsx";
import type { VoyageDraft } from "#views/open-voyage-draft.ts";
import { roleDefault, roleLabel, voyagePlaceholder } from "#views/role-settings.ts";
import { RoleSettingsFields } from "#views/role-settings-fields.tsx";

export const VoyageFields = ({
	backends,
	defaults,
	draft,
	onChange,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly defaults: ReadonlyArray<RoleSettings>;
	readonly draft: VoyageDraft;
	readonly onChange: (draft: VoyageDraft) => void;
}) => (
	<div className="flex min-w-0 flex-col gap-3">
		<LabelledField label="Name">
			{(id) => <Input id={id} onChange={(event) => onChange({ ...draft, name: event.target.value })} value={draft.name} />}
		</LabelledField>
		<LabelledField label="North star">
			{(id) => <Input id={id} onChange={(event) => onChange({ ...draft, northStar: event.target.value })} value={draft.northStar} />}
		</LabelledField>
		<LabelledField label="Context">
			{(id) => <Textarea id={id} onChange={(event) => onChange({ ...draft, context: event.target.value })} rows={3} value={draft.context} />}
		</LabelledField>
		<RoleSettingsFields
			backends={backends}
			drafts={{ captain: draft.captain, crew: draft.crew }}
			inheritLabel="Fleet default"
			lines={VOYAGE_AGENT_ROLES.map((role: VoyageAgentRole) => ({
				label: roleLabel[role],
				placeholder: voyagePlaceholder(backends, roleDefault(defaults, role)),
				role,
			}))}
			onChange={(role, next) => onChange(role === "captain" ? { ...draft, captain: next } : { ...draft, crew: next })}
		/>
	</div>
);
