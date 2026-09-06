import { Schema } from "effect";

export const brand = <Name extends string>(name: Name) => Schema.String.pipe(Schema.brand(name));

export const make = (): string => crypto.randomUUID();

export const Request = brand("RequestId");

export type Request = typeof Request.Type;
