import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { DomainEvent } from "./DomainEvent.ts";

class OrderPlacedEvent implements DomainEvent {
  public readonly eventName = "OrderPlaced";
  public readonly occurredAt: Date;
  public readonly aggregateId: string;
  public readonly amount: number;

  constructor(aggregateId: string, amount: number) {
    this.aggregateId = aggregateId;
    this.amount = amount;
    this.occurredAt = new Date();
  }
}

describe("DomainEvent", () => {
  it("should have an eventName", () => {
    const event = new OrderPlacedEvent("order-1", 100);

    assert.equal(event.eventName, "OrderPlaced");
  });

  it("should have an occurredAt timestamp", () => {
    const event = new OrderPlacedEvent("order-1", 100);

    assert.ok(event.occurredAt instanceof Date);
  });

  it("should have an aggregateId", () => {
    const event = new OrderPlacedEvent("order-1", 100);

    assert.equal(event.aggregateId, "order-1");
  });

  it("should carry domain-specific data", () => {
    const event = new OrderPlacedEvent("order-1", 250);

    assert.equal(event.amount, 250);
  });
});
