import { rulingNoticeReceipt as row } from "@antumbra/domain-rulings/rows/notice-receipt.ts";
import { bucket } from "@shivaedev/changes/buckets.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { makeRepository } from "@shivaedev/sql/repository.ts";
import { Schema } from "effect";
import { Model } from "effect/schema";
import { field } from "#records/field.ts";

class Stored extends Model.Class<Stored>("rulingNoticeReceipt")({
	id: row.fields.id,
	rulingId: field(bucket(row.fields.rulingId)),
	deliveredAt: field(row.fields.deliveredAt),
	storage_order: Model.GeneratedByDb(Schema.Unknown),
}) {}
export const repository = makeRepository(Stored, {
	tableName: "rulingNoticeReceipt",
	idColumn: "id",
	spanPrefix: "rulingNoticeReceipt",
	collection: collection("rulingNoticeReceipt", Schema.String, { rulingId: Schema.String }),
});

export const selection = ["id", "rulingId", "deliveredAt"] as const;
