import { SessionOperationId } from "@antumbra/domain-sessions/ids.ts";
import type { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
export const inputOperationId = (id: SessionInputId) => SessionOperationId.make(`input-delivery:${id}`);
