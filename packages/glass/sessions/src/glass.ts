import type { agents } from "@antumbra/domain-agents/feature.ts";
import type { changes } from "@antumbra/domain-changes/feature.ts";
import type { costs } from "@antumbra/domain-costs/feature.ts";
import type { inputs } from "@antumbra/domain-inputs/feature.ts";
import type { pieces } from "@antumbra/domain-pieces/feature.ts";
import type { reclamation } from "@antumbra/domain-reclamation/feature.ts";
import type { repos } from "@antumbra/domain-repos/feature.ts";
import type { sessions } from "@antumbra/domain-sessions/feature.ts";
import type { starts } from "@antumbra/domain-starts/feature.ts";
import type { voyages } from "@antumbra/domain-voyages/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";

export type SessionsApi = Glass<
	readonly [
		typeof agents,
		typeof sessions,
		typeof costs,
		typeof pieces,
		typeof voyages,
		typeof repos,
		typeof reclamation,
		typeof changes,
		typeof inputs,
		typeof starts,
	]
>["api"];
