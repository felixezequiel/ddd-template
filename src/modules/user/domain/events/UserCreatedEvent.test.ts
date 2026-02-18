import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UserCreatedEvent } from "./UserCreatedEvent.ts";

describe("UserCreatedEvent", () => {
  it("should have the event name UserCreated", () => {
    const event = new UserCreatedEvent("user-1", "user@example.com");

    assert.equal(event.eventName, "UserCreated");
  });

  it("should store the aggregate id", () => {
    const event = new UserCreatedEvent("user-1", "user@example.com");

    assert.equal(event.aggregateId, "user-1");
  });

  it("should store the email", () => {
    const event = new UserCreatedEvent("user-1", "user@example.com");

    assert.equal(event.email, "user@example.com");
  });

  it("should have an occurredAt timestamp", () => {
    const event = new UserCreatedEvent("user-1", "user@example.com");

    assert.ok(event.occurredAt instanceof Date);
  });
});
