import { Schema } from "effect";
import { MessageDelivered, MessageRead, MessageSent } from "#mail.ts";
import { MailWakeEvidence } from "#mail-evidence.ts";

export const MailEvent = Schema.Union([
	Schema.Struct({ _tag: Schema.tag("MessageSent"), ...MessageSent.fields }),
	Schema.Struct({ _tag: Schema.tag("MessageDelivered"), ...MessageDelivered.fields }),
	Schema.Struct({ _tag: Schema.tag("MessageRead"), ...MessageRead.fields }),
	Schema.Struct({ _tag: Schema.tag("MailWakeObserved"), ...MailWakeEvidence.fields }),
]);
