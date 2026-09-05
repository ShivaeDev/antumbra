const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const dateOf = (day: string): Date => {
	const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
	return new Date(year, month - 1, date);
};

export const dayLabel = (day: string): string => {
	const at = dateOf(day);
	return `${at.getDate()} ${MONTHS[at.getMonth()] ?? ""}`;
};

export const dayName = (day: string): string => `${WEEKDAYS[dateOf(day).getDay()] ?? ""} ${dayLabel(day)}`;
