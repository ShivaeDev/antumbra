import { Option, Schema } from "effect";
import { MessageUpdatedProperties } from "#protocol-messages.ts";

export interface MessageAuthor {
	readonly model: Option.Option<string>;
	readonly role: "agent" | "user";
}

export interface MessageAuthors {
	readonly of: (messageId: string) => Option.Option<MessageAuthor>;
	readonly record: (properties: unknown) => void;
}

const decodeMessage = Schema.decodeUnknownOption(MessageUpdatedProperties);

const modelOf = (info: typeof MessageUpdatedProperties.Type.info) =>
	info.providerID === undefined || info.modelID === undefined ? Option.none() : Option.some(`${info.providerID}/${info.modelID}`);

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
