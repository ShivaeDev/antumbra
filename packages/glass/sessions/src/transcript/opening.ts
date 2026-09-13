const HEADING = /^#{1,6}\s+/;

export const openingSummary = (markdown: string): string | undefined => {
	const lines = [];
	for (const line of markdown.split("\n")) {
		const trimmed = line.trim();
		if (trimmed !== "") lines.push(trimmed);
	}
	const [head] = lines;
	if (head === undefined || lines.length < 2) return undefined;
	const plain = head.replace(HEADING, "");
	return plain === "" ? undefined : plain;
};
