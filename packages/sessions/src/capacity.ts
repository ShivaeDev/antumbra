import type { IntentExecution } from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";
import type { Effect } from "effect";

interface SessionCapacityReading {
	readonly status: string;
}

export type StoredBackendCapacityInvalid = {
	readonly _tag: "StoredBackendCapacityInvalid";
	readonly backend: string;
	readonly status: string;
};

export interface SessionCapacities {
	readonly admit: (backend: string) => Effect.Effect<void, unknown, IntentExecution>;
	readonly current: (backend: string) => Effect.Effect<SessionCapacityReading, PrismaError | StoredBackendCapacityInvalid>;
}
