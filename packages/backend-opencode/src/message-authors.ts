import { Option, Schema } from "effect";
import { MessageUpdatedProperties } from "#protocol-messages.ts";

export interface MessageAuthor {
	readonly model: Option.Option<string>;
	readonly role: "agent" | "user";
}

// why: opencode sends a part without saying who wrote it — role and model live
// on the message, which the server always announces before the parts under it.
// The record therefore has to remember the announcement to attribute the words.
// A part whose message was never announced stays raw rather than being
// attributed to a guess, which is what a session attached mid-turn would see.
export interface MessageAuthors {
	readonly of: (messageId: string) => Option.Option<MessageAuthor>;
	readonly record: (properties: unknown) => void;
}

const decodeMessage = Schema.decodeUnknownOption(MessageUpdatedProperties);

const modelOf = (info: typeof MessageUpdatedProperties.Type.info) =>
	info.providerID === undefined || info.modelID === undefined
		? Option.none()
		: Option.some(`${info.providerID}/${info.modelID}`);

export const openMessageAuthors = (): MessageAuthors => {
	const authors = new Map<string, MessageAuthor>();
	return {
		of: (messageId) => Option.fromNullishOr(authors.get(messageId)),
		record: (properties) => {
			Option.match(decodeMessage(properties), {
				onNone: () => {},
				onSome: ({ info }) => {
					authors.set(info.id, {
						model: modelOf(info),
						role: info.role === "user" ? "user" : "agent",
					});
				},
			});
		},
	};
};
