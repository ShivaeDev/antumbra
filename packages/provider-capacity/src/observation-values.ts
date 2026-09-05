import type { BackendCapacityObservation } from "@antumbra/plugin-api";
import { Option } from "effect";

export const availableCapacityValues = (observedAt: Date, updatedAt = observedAt) => ({
	detail: null,
	observedAt,
	reason: null,
	resetsAt: null,
	status: "available",
	updatedAt,
	utilization: null,
});

const severity = (status: string): number => {
	switch (status) {
		case "available":
			return 0;
		case "warning":
			return 1;
		case "blocked":
			return 2;
		default:
			return -1;
	}
};

export const ignoreCapacityObservation = (
	current: Option.Option<{
		readonly observedAt: Date;
		readonly status: string;
	}>,
	observation: BackendCapacityObservation,
): boolean => {
	if (Option.isNone(current)) {
		return false;
	}
	const comparison = current.value.observedAt.getTime() - observation.observedAt;
	if (comparison > 0 || (comparison === 0 && severity(current.value.status) >= severity(observation.status))) {
		return true;
	}
	// Only an admiral clear releases a blocked backend.
	return current.value.status === "blocked" && observation.status !== "blocked";
};

export const capacityObservationValues = (observation: BackendCapacityObservation, updatedAt: Date) => {
	const limited = observation.status !== "available";
	return {
		detail: limited ? observation.detail : null,
		observedAt: new Date(observation.observedAt),
		reason: limited ? observation.reason : null,
		resetsAt: limited && observation.resetsAt !== undefined ? new Date(observation.resetsAt) : null,
		status: observation.status,
		updatedAt,
		utilization: limited && observation.utilization !== undefined ? observation.utilization : null,
	};
};
