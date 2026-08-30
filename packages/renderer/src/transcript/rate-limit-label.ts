import type { RateLimitEvent, RateLimitWindow } from "@antumbra/vocabulary/session-events";

type Limit = typeof RateLimitEvent.Type;
type Window = typeof RateLimitWindow.Type;

const HOUR = 60;
const DAY = 24 * HOUR;

const STATUS: Record<Limit["status"], string> = {
	allowed: "rate limit",
	rejected: "rate limit reached",
	unknown: "rate limit",
	warning: "rate limit nearing",
};

const clock = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
});

const length = (minutes: number): string => {
	if (minutes % DAY === 0) {
		return `${minutes / DAY}d`;
	}
	return minutes % HOUR === 0 ? `${minutes / HOUR}h` : `${minutes}m`;
};

const windowName = (window: Window): string => {
	const words = [
		...(window.durationMinutes === undefined ? [] : [length(window.durationMinutes)]),
		...(window.model === undefined ? [] : [window.model]),
	];
	return words.length === 0 ? "limit" : `${words.join(" ")} window`;
};

const windowWords = (window: Window): string =>
	[`${window.usedPercent}% of ${windowName(window)}`, ...(window.resetsAt === undefined ? [] : [`resets ${clock.format(window.resetsAt)}`])].join(
		", ",
	);

export const rateLimitLabel = (event: Limit): string => [STATUS[event.status], ...event.windows.map(windowWords)].join(" · ");
