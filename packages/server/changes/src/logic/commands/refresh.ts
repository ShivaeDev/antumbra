import type * as Source from "@antumbra/domain-changes/commands/refresh.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { ChangeRefresh } from "@antumbra/platform-vocabulary/changes.ts";
import { ChangeRefreshRequestedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Effect } from "effect";
export const changeRefresh = row("changeRefresh", ChangeRefresh.fields, { key: "id" });
export const refreshRequested = fact("ChangeRefreshRequested", ChangeRefreshRequestedPayload.fields);
export const refresh = (input: typeof Source.refresh.Input.Type) => Effect.succeed({ request: input.requestId });
