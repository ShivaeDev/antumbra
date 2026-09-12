import type { RowValue } from "@antumbra/platform-feature/row.ts";
import type { moorage } from "#rows/moorage.ts";
import type { resourceOwner } from "#rows/resource-owner.ts";

export const canReclaim = (owner: RowValue<typeof resourceOwner>, site: RowValue<typeof moorage>): boolean =>
	owner.status === "retired" || (owner.status === "dormant" && (site.status === "provisioning" || owner.openSessions === 0));
