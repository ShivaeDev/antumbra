import type { MailRow } from "@antumbra/boards";

const mailLine = (held: MailRow): string => [held.id, `[${held.precedence}]`, held.sentAt.toISOString(), `— ${held.body}`].join(" ");

export const renderMail = (held: ReadonlyArray<MailRow>): string => (held.length === 0 ? "No mail." : held.map(mailLine).join("\n"));
