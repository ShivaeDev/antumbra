const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const waitedWords = (millis: number): string => {
	if (millis < MINUTE) {
		return "waiting under a minute";
	}
	if (millis < HOUR) {
		return `waiting ${Math.floor(millis / MINUTE)}m`;
	}
	return millis < DAY ? `waiting ${Math.floor(millis / HOUR)}h` : `waiting ${Math.floor(millis / DAY)}d`;
};
