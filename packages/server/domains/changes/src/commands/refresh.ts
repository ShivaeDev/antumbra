import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { ChangeRefresh } from "@antumbra/platform-vocabulary/changes.ts";
import { ChangeRefreshRequestedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
export const changeRefresh = row("changeRefresh", ChangeRefresh.fields, { key: "id" });
export const refreshRequested = fact("ChangeRefreshRequested", ChangeRefreshRequestedPayload.fields);
export const refresh = command("refresh", {
	input: {},
	reads: [],
	emits: refreshRequested,
	rejections: {},
});
