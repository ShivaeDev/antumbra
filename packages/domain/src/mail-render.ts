import type { BoardEntryRow } from "@antumbra/boards";

const mailLine = (entry: BoardEntryRow): string =>
	[entry.id, `[${entry.precedence}]`, entry.createdAt.toISOString(), `— ${entry.body}`, `(${entry.sourceRef})`].join(" ");

export const renderMail = (entries: ReadonlyArray<BoardEntryRow>): string => (entries.length === 0 ? "No mail." : entries.map(mailLine).join("\n"));
