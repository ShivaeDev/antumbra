import { useLive, useSend } from "@antumbra/glass-client/hooks.ts";
import { type AgentRole, VOYAGE_AGENT_ROLES } from "@antumbra/vocabulary/agent-role.ts";
import { useAtomRef } from "@effect/atom-react";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { RoleBoard } from "#board.tsx";
import { changedRoles, draftAt, storedAt, voyagePlaceholder } from "#drafts.ts";
import { useSettingsForm } from "#form.ts";
import type { Choose, RoleSettingsApi } from "#glass.ts";
import type { BackendModels, Stored } from "#shape.ts";

const VoyageBoard = (props: {
	readonly backends: readonly BackendModels[];
	readonly defaults: readonly Stored[];
	readonly rows: readonly Stored[];
	readonly send: Choose;
	readonly voyageId: string;
}) => {
	const form = useSettingsForm({ roles: VOYAGE_AGENT_ROLES, rows: props.rows, scope: props.voyageId, send: props.send });
	const values = useAtomRef(form.values);
	const placeholderOf = (role: AgentRole) => voyagePlaceholder(props.backends, storedAt(props.defaults, role), draftAt(values, role).backend);
	return (
		<RoleBoard
			backends={props.backends}
			changed={changedRoles(VOYAGE_AGENT_ROLES, values, props.rows)}
			form={form}
			inheritLabel="Fleet default"
			placeholderOf={placeholderOf}
			roles={VOYAGE_AGENT_ROLES}
		/>
	);
};

export const VoyageRoleSettings = (props: {
	readonly api: RoleSettingsApi;
	readonly backends: readonly BackendModels[];
	readonly voyageId: string;
}) => {
	const stored = useLive(props.api.roleSettings.forVoyage, { voyageId: props.voyageId });
	const defaults = useLive(props.api.roleSettings.defaults, {});
	const send = useSend(props.api.roleSettings.choose);
	return Option.match(AsyncResult.value(stored), {
		onNone: () => <p className="text-2xs text-muted-foreground">Reading this voyage's role settings…</p>,
		onSome: (rows) => (
			<VoyageBoard
				backends={props.backends}
				defaults={Option.getOrElse(AsyncResult.value(defaults), (): readonly Stored[] => [])}
				key={props.voyageId}
				rows={rows}
				send={send}
				voyageId={props.voyageId}
			/>
		),
	});
};
