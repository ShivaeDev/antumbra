import { Mail, type MailInput, MailNotAddressed, type MailRow } from "@antumbra/boards";
import { Clock, Effect, Layer, Ref } from "effect";

export type ScriptedMailbag = Ref.Ref<readonly MailRow[]>;

export const scriptedMailbag = (): ScriptedMailbag => Ref.makeUnsafe<readonly MailRow[]>([]);

const sentOrder = (bag: readonly MailRow[]): ReadonlyArray<MailRow> => bag.toSorted((left, right) => left.sentAt.getTime() - right.sentAt.getTime());

const addressedTo = (bag: readonly MailRow[], agentId: string, messageIds: ReadonlyArray<string>) => {
	const carried: MailRow[] = [];
	for (const messageId of messageIds) {
		const found = bag.find((held) => held.id === messageId);
		if (found === undefined || found.toAgentId !== agentId) {
			return { _tag: "Stray", messageId } as const;
		}
		carried.push(found);
	}
	return { _tag: "Addressed", carried } as const;
};

const stamping = (
	state: ScriptedMailbag,
	stampedAt: (held: MailRow) => Date | null,
	stamp: (held: MailRow, at: Date) => MailRow,
): ((agentId: string, messageIds: ReadonlyArray<string>) => Effect.Effect<void, MailNotAddressed>) =>
	Effect.fnUntraced(function* (agentId: string, messageIds: ReadonlyArray<string>) {
		const bag = yield* Ref.get(state);
		const scanned = addressedTo(bag, agentId, messageIds);
		if (scanned._tag === "Stray") {
			return yield* new MailNotAddressed({ agentId, messageId: scanned.messageId });
		}
		const at = new Date(yield* Clock.currentTimeMillis);
		const waiting = new Set(scanned.carried.filter((held) => stampedAt(held) === null).map((held) => held.id));
		yield* Ref.set(
			state,
			bag.map((held) => (waiting.has(held.id) ? stamp(held, at) : held)),
		);
	});

export const scriptedMailOn = (state: ScriptedMailbag): Layer.Layer<Mail> =>
	Layer.sync(Mail)(() => {
		const mailbox = (agentId: string) => Effect.map(Ref.get(state), (bag) => sentOrder(bag.filter((held) => held.toAgentId === agentId)));
		return {
			mailbox,
			markDelivered: stamping(
				state,
				(held) => held.deliveredAt,
				(held, at) => ({ ...held, deliveredAt: at }),
			),
			markRead: stamping(
				state,
				(held) => held.readAt,
				(held, at) => ({ ...held, readAt: at }),
			),
			send: Effect.fnUntraced(function* (input: MailInput) {
				const bag = yield* Ref.get(state);
				if (bag.some((held) => held.id === input.requestId)) {
					return;
				}
				const sent: MailRow = {
					authorAgentId: input.authorAgentId,
					body: input.body.trim(),
					deliveredAt: null,
					id: input.requestId,
					precedence: input.precedence,
					readAt: null,
					sentAt: new Date(yield* Clock.currentTimeMillis),
					toAgentId: input.toAgentId,
				};
				yield* Ref.set(state, [...bag, sent]);
			}),
			unread: (agentId: string) => Effect.map(mailbox(agentId), (bag) => bag.filter((held) => held.readAt === null)),
		};
	});

export const scriptedMail: Layer.Layer<Mail> = Layer.unwrap(Effect.sync(() => scriptedMailOn(scriptedMailbag())));
