import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AddressAddedEvent } from "./AddressAddedEvent.ts";

describe("AddressAddedEvent", () => {
  it("should have the event name AddressAdded", () => {
    const event = new AddressAddedEvent("user-1", "addr-1");

    assert.equal(event.eventName, "AddressAdded");
  });

  it("should store the aggregate id", () => {
    const event = new AddressAddedEvent("user-1", "addr-1");

    assert.equal(event.aggregateId, "user-1");
  });

  it("should store the address id", () => {
    const event = new AddressAddedEvent("user-1", "addr-1");

    assert.equal(event.addressId, "addr-1");
  });

  it("should have an occurredAt timestamp", () => {
    const event = new AddressAddedEvent("user-1", "addr-1");

    assert.ok(event.occurredAt instanceof Date);
  });
});
