const HEADING = /^#{1,6}\s+/;

const spoken = (markdown: string): string[] => {
	const lines = [];
	for (const line of markdown.split("\n")) {
		const trimmed = line.trim();
		if (trimmed !== "") lines.push(trimmed);
	}
	return lines;
};

export const headline = (markdown: string): string => {
	const [head] = spoken(markdown);
	return head === undefined ? "" : head.replace(HEADING, "");
};

export const runsLong = (markdown: string): boolean => spoken(markdown).length > 1;
