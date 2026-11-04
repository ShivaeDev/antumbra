import { contract } from "@shivaedev/contract/contract.ts";
import {
	AcknowledgeNotice,
	AddContext,
	Answer,
	Gate,
	MarkDelivered,
	Park,
	PassUp,
	Proclaim,
	Reclassify,
	Request,
	Supersede,
	Withdraw,
} from "#contract/commands.ts";
import { Authority, AwaitingAscent, AwaitingDelivery, Delivery, OpenGates } from "#contract/delivery.ts";
import { Binding, ById, Choices, Display, Frontier, Open, Replacements, Standing } from "#contract/reading.ts";
export const RulingsContract = contract("rulings", {
	commands: [AcknowledgeNotice, AddContext, Answer, Gate, MarkDelivered, Park, PassUp, Proclaim, Reclassify, Request, Supersede, Withdraw],
	queries: [
		Delivery,
		Authority,
		Choices,
		Replacements,
		Display,
		AwaitingAscent,
		AwaitingDelivery,
		Binding,
		ById,
		Frontier,
		OpenGates,
		Open,
		Standing,
	],
});
