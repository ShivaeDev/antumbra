import { CommandAct } from "@antumbra/glass-components/act.tsx";
import type { ChangesApi, QuayChange } from "#glass.ts";
export const QuayDismiss = ({ api, item }: { readonly api: ChangesApi; readonly item: QuayChange }) =>
	item.stage === "withdrawn" && item.archivedAt === null ? (
		<CommandAct command={api.changes.dismiss} input={{ changeId: item.id }} label="Dismiss" />
	) : null;
