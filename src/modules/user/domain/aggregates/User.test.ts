import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { User } from "./User.ts";
import { UserId } from "../identifiers/UserId.ts";
import { Email } from "../valueObjects/Email.ts";
import { AddressId } from "../identifiers/AddressId.ts";

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

  it("should start with an empty list of addresses", () => {
    const user = User.create(new UserId("user-1"), "John", new Email("john@example.com"));

    assert.equal(user.addresses.length, 0);
  });

  it("should add an address and emit AddressAddedEvent", () => {
    const user = User.create(new UserId("user-1"), "John", new Email("john@example.com"));
    const addressId = new AddressId("addr-1");

    user.addAddress(addressId, "Rua das Flores", "123", "Sao Paulo", "SP", "01000-000");

    assert.equal(user.addresses.length, 1);
    assert.equal(user.addresses[0]!.id.value, "addr-1");
    assert.equal(user.addresses[0]!.props.street, "Rua das Flores");

    const events = user.getDomainEvents();
    const addressAddedEvent = events[events.length - 1]!;
    assert.equal(addressAddedEvent.eventName, "AddressAdded");
  });

  it("should remove an address by id and emit AddressRemovedEvent", () => {
    const user = User.create(new UserId("user-1"), "John", new Email("john@example.com"));
    const addressId = new AddressId("addr-1");
    user.addAddress(addressId, "Rua das Flores", "123", "Sao Paulo", "SP", "01000-000");

    user.removeAddress(addressId);

    assert.equal(user.addresses.length, 0);

    const events = user.getDomainEvents();
    const addressRemovedEvent = events[events.length - 1]!;
    assert.equal(addressRemovedEvent.eventName, "AddressRemoved");
  });

  it("should throw when removing an address that does not exist", () => {
    const user = User.create(new UserId("user-1"), "John", new Email("john@example.com"));
    const nonExistentId = new AddressId("addr-999");

    assert.throws(
      () => user.removeAddress(nonExistentId),
      { message: "Address not found: addr-999" },
    );
  });

  it("should manage multiple addresses independently", () => {
    const user = User.create(new UserId("user-1"), "John", new Email("john@example.com"));
    const firstAddressId = new AddressId("addr-1");
    const secondAddressId = new AddressId("addr-2");

    user.addAddress(firstAddressId, "Rua A", "1", "Sao Paulo", "SP", "01000-000");
    user.addAddress(secondAddressId, "Rua B", "2", "Rio de Janeiro", "RJ", "20000-000");

    assert.equal(user.addresses.length, 2);

    user.removeAddress(firstAddressId);

    assert.equal(user.addresses.length, 1);
    assert.equal(user.addresses[0]!.id.value, "addr-2");
  });
});
