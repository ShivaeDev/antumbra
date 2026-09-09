import { useLive, useSend } from "@antumbra/glass-client/hooks.ts";
import { FLEET } from "@antumbra/role-settings/ids.ts";
import { AGENT_ROLES } from "@antumbra/vocabulary/agent-role.ts";
import { useAtomRef } from "@effect/atom-react";
import { Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { RoleBoard } from "#board.tsx";
import { changedRoles, fleetPlaceholder } from "#drafts.ts";
import { useSettingsForm } from "#form.ts";
import type { Choose, RoleSettingsApi } from "#glass.ts";
import type { BackendModels, Stored } from "#shape.ts";

const DefaultsBoard = (props: { readonly backends: readonly BackendModels[]; readonly rows: readonly Stored[]; readonly send: Choose }) => {
	const form = useSettingsForm({ roles: AGENT_ROLES, rows: props.rows, scope: FLEET, send: props.send });
	const values = useAtomRef(form.values);
	const placeholder = fleetPlaceholder(props.backends);
	return (
		<RoleBoard
			backends={props.backends}
			changed={changedRoles(AGENT_ROLES, values, props.rows)}
			form={form}
			inheritLabel={null}
			placeholderOf={() => placeholder}
			roles={AGENT_ROLES}
		/>
	);
};

export const RoleDefaults = (props: { readonly api: RoleSettingsApi; readonly backends: readonly BackendModels[] }) => {
	const stored = useLive(props.api.roleSettings.defaults, {});
	const send = useSend(props.api.roleSettings.choose);
	return (
		<section className="flex flex-col gap-3 rounded-md border border-border p-4">
			<h3 className="text-sm font-medium">Fleet defaults</h3>
			<p className="text-xs text-muted-foreground">Each role runs on these unless a voyage sets its own; the flagship and smoother are fleet-wide.</p>
			{Option.match(AsyncResult.value(stored), {
				onNone: () => <p className="text-xs text-muted-foreground">Reading the fleet's defaults…</p>,
				onSome: (rows) => <DefaultsBoard backends={props.backends} rows={rows} send={send} />,
			})}
		</section>
	);
};
