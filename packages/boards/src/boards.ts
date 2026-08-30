import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { type Context, Effect } from "effect";
import { mail, markMailRead, unreadMail } from "#mailbox.ts";
import { readBoard } from "#read.ts";
import { ensureBoard, writeEntry } from "#write.ts";

const requirements = [Database, DomainFeeds] as const;

export const Boards = defineService({
	id: "@antumbra/boards/Boards",
	initialize: Effect.void,
	methods: () => ({
		ensure: ensureBoard,
		mail,
		markRead: markMailRead,
		read: readBoard,
		unread: unreadMail,
		write: writeEntry,
	}),
	requires: requirements,
});

export type BoardsService = Context.Service.Shape<typeof Boards>;

export const BoardsLive = Boards.layer;
