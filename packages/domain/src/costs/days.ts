const pad = (value: number): string => String(value).padStart(2, "0");

export const dayKey = (at: Date): string => `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;

export const dayStart = (now: Date, back: number): Date => new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);

export const windowDays = (now: Date, span: number): ReadonlyArray<string> =>
	Array.from({ length: span }, (_unused, index) => dayKey(dayStart(now, span - 1 - index)));
