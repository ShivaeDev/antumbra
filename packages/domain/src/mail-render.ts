import type { MailRow } from "@antumbra/boards";

const mailLine = (entry: MailRow): string =>
	[entry.id, `[${entry.precedence}]`, entry.createdAt.toISOString(), `— ${entry.body}`, `(${entry.sourceRef})`].join(" ");

export const renderMail = (entries: ReadonlyArray<MailRow>): string => (entries.length === 0 ? "No mail." : entries.map(mailLine).join("\n"));
