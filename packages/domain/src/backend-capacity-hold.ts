import { Option } from "effect";

const CAPACITY_HOLD_PREFIX = "provider-capacity:v1:";

export const capacityHoldDetail = (
	backend: string,
	detail: string | null,
): string =>
	`${CAPACITY_HOLD_PREFIX}${backend}: ${detail ?? "provider capacity is exhausted"}`;

export const parseCapacityHoldDetail = (
	detail: string | null,
): Option.Option<{ readonly backend: string }> => {
	if (detail === null || !detail.startsWith(CAPACITY_HOLD_PREFIX)) {
		return Option.none();
	}
	const remainder = detail.slice(CAPACITY_HOLD_PREFIX.length);
	const separator = remainder.indexOf(":");
	return separator <= 0
		? Option.none()
		: Option.some({ backend: remainder.slice(0, separator) });
};
