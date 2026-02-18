import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { AggregateRoot } from "./AggregateRoot.ts";
import { Identifier } from "../identifiers/Identifier.ts";
import type { DomainEvent } from "../events/DomainEvent.ts";

class OrderId extends Identifier {}

interface OrderProps {
  readonly customerName: string;
  readonly total: number;
}

class OrderCreatedEvent implements DomainEvent {
  public readonly eventName = "OrderCreated";
  public readonly occurredAt: Date;
  public readonly aggregateId: string;

  constructor(aggregateId: string) {
    this.aggregateId = aggregateId;
    this.occurredAt = new Date();
  }
}

class OrderShippedEvent implements DomainEvent {
  public readonly eventName = "OrderShipped";
  public readonly occurredAt: Date;
  public readonly aggregateId: string;

  constructor(aggregateId: string) {
    this.aggregateId = aggregateId;
    this.occurredAt = new Date();
  }
}

class Order extends AggregateRoot<OrderId, OrderProps> {
  public static create(id: OrderId, customerName: string, total: number): Order {
    const order = new Order(id, { customerName, total });
    order.addDomainEvent(new OrderCreatedEvent(id.value));
    return order;
  }

  public ship(): void {
    this.addDomainEvent(new OrderShippedEvent(this.id.value));
  }
}

describe("AggregateRoot", () => {
  it("should extend Entity with id and props", () => {
    const orderId = new OrderId("order-1");
    const order = new Order(orderId, { customerName: "John", total: 100 });

    assert.equal(order.id.value, "order-1");
    assert.equal(order.props.customerName, "John");
  });

  it("should collect domain events", () => {
    const order = Order.create(new OrderId("order-1"), "John", 100);

    const events = order.getDomainEvents();

    assert.equal(events.length, 1);
    assert.equal(events[0]!.eventName, "OrderCreated");
  });

  it("should accumulate multiple domain events", () => {
    const order = Order.create(new OrderId("order-1"), "John", 100);
    order.ship();

    const events = order.getDomainEvents();

    assert.equal(events.length, 2);
    assert.equal(events[0]!.eventName, "OrderCreated");
    assert.equal(events[1]!.eventName, "OrderShipped");
  });

  it("should drain domain events and clear the internal list", () => {
    const order = Order.create(new OrderId("order-1"), "John", 100);
    order.ship();

    const drainedEvents = order.drainDomainEvents();
    const remainingEvents = order.getDomainEvents();

    assert.equal(drainedEvents.length, 2);
    assert.equal(remainingEvents.length, 0);
  });

  it("should return an empty list when no events were added", () => {
    const order = new Order(new OrderId("order-1"), { customerName: "John", total: 100 });

    const events = order.getDomainEvents();

    assert.equal(events.length, 0);
  });

  it("should preserve equality by id (inherited from Entity)", () => {
    const firstOrder = new Order(
      new OrderId("order-1"),
      { customerName: "John", total: 100 }
    );
    const secondOrder = new Order(
      new OrderId("order-1"),
      { customerName: "Jane", total: 200 }
    );

    assert.ok(firstOrder.equals(secondOrder));
  });
});
