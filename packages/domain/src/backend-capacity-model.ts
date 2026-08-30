import { Data, Effect, Schema } from "effect";

export type BackendCapacityStatus = "available" | "blocked" | "warning";

export interface BackendCapacityReading {
	readonly backend: string;
	readonly detail: string | null;
	readonly observedAt: Date | null;
	readonly reason: string | null;
	readonly resetsAt: Date | null;
	readonly status: BackendCapacityStatus;
	readonly utilization: number | null;
}

export class StoredBackendCapacityInvalid extends Data.TaggedError(
	"StoredBackendCapacityInvalid",
)<{
	readonly backend: string;
	readonly status: string;
}> {
	override get message(): string {
		return `backend ${this.backend} has invalid capacity status ${JSON.stringify(this.status)}`;
	}
}

const isCapacityStatus = Schema.is(
	Schema.Literals(["available", "blocked", "warning"]),
);

export const defaultCapacityReading = (
	backend: string,
): BackendCapacityReading => ({
	backend,
	detail: null,
	observedAt: null,
	reason: null,
	resetsAt: null,
	status: "available",
	utilization: null,
});

export const storedCapacityReading = (row: {
	readonly backend: string;
	readonly detail: string | null;
	readonly observedAt: Date;
	readonly reason: string | null;
	readonly resetsAt: Date | null;
	readonly status: string;
	readonly utilization: number | null;
}): Effect.Effect<BackendCapacityReading, StoredBackendCapacityInvalid> => {
	const status = row.status;
	return isCapacityStatus(status)
		? Effect.succeed({
				backend: row.backend,
				detail: row.detail,
				observedAt: row.observedAt.getTime() === 0 ? null : row.observedAt,
				reason: row.reason,
				resetsAt: row.resetsAt,
				status,
				utilization: row.utilization,
			})
		: Effect.fail(
				new StoredBackendCapacityInvalid({ backend: row.backend, status }),
			);
};
