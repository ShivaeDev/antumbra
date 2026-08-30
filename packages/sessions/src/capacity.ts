import type { IntentExecution } from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";
import type { Effect } from "effect";

export interface SessionCapacityReading {
	readonly status: string;
}

// why: send and wake only ask whether a provider is blocked, and whether a
// blocked provider may admit work. Domain owns the durable capacity ledger;
// this is the slice the Session tree may name without importing domain.
export type StoredBackendCapacityInvalid = {
	readonly _tag: "StoredBackendCapacityInvalid";
	readonly backend: string;
	readonly status: string;
};

export interface SessionCapacities {
	readonly admit: (backend: string) => Effect.Effect<void, unknown, IntentExecution>;
	readonly current: (backend: string) => Effect.Effect<SessionCapacityReading, PrismaError | StoredBackendCapacityInvalid>;
}
