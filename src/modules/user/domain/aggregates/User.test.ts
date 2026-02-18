import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { User } from "./User.ts";
import { UserId } from "../identifiers/UserId.ts";
import { Email } from "../valueObjects/Email.ts";

describe("User", () => {
  it("should create a user with id, name, and email", () => {
    const userId = new UserId("user-1");
    const email = new Email("john@example.com");

    const user = User.create(userId, "John Doe", email);

    assert.equal(user.id.value, "user-1");
    assert.equal(user.props.name, "John Doe");
    assert.ok(user.props.email.equals(email));
  });

  it("should emit UserCreatedEvent when created", () => {
    const userId = new UserId("user-1");
    const email = new Email("john@example.com");

    const user = User.create(userId, "John Doe", email);
    const events = user.getDomainEvents();

    assert.equal(events.length, 1);
    assert.equal(events[0]!.eventName, "UserCreated");
    assert.equal(events[0]!.aggregateId, "user-1");
  });

  it("should be equal to another user with the same id", () => {
    const firstUser = User.create(
      new UserId("user-1"),
      "John",
      new Email("john@example.com"),
    );
    const secondUser = User.create(
      new UserId("user-1"),
      "Jane",
      new Email("jane@example.com"),
    );

    assert.ok(firstUser.equals(secondUser));
  });

  it("should not be equal to a user with a different id", () => {
    const firstUser = User.create(
      new UserId("user-1"),
      "John",
      new Email("john@example.com"),
    );
    const secondUser = User.create(
      new UserId("user-2"),
      "John",
      new Email("john@example.com"),
    );

    assert.ok(!firstUser.equals(secondUser));
  });
});
