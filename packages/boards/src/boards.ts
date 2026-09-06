import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { type Context, Effect } from "effect";
import { mail, markMailDelivered, markMailRead, unreadMail } from "#mailbox.ts";
import { readBoard, readDigest, readUncoveredDays, readUncoveredSpan, readUnder } from "#read.ts";
import { ensureBoard, writeEntry } from "#write.ts";

const requirements = [Database, DomainFeeds] as const;

export const Boards = defineService({
	id: "@antumbra/boards/Boards",
	initialize: Effect.void,
	methods: () => ({
		digest: readDigest,
		ensure: ensureBoard,
		mail,
		markDelivered: markMailDelivered,
		markRead: markMailRead,
		read: readBoard,
		span: readUncoveredSpan,
		uncovered: readUncoveredDays,
		under: readUnder,
		unread: unreadMail,
		write: writeEntry,
	}),
	requires: requirements,
});

export type BoardsService = Context.Service.Shape<typeof Boards>;

export const BoardsLive = Boards.layer;
