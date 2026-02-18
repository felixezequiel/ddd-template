import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Address } from "./Address.ts";
import { AddressId } from "../identifiers/AddressId.ts";

describe("Address", () => {
  it("should create an address with all properties", () => {
    const addressId = new AddressId("addr-1");
    const address = Address.create(addressId, "Rua das Flores", "123", "Sao Paulo", "SP", "01000-000");

    assert.equal(address.id.value, "addr-1");
    assert.equal(address.props.street, "Rua das Flores");
    assert.equal(address.props.number, "123");
    assert.equal(address.props.city, "Sao Paulo");
    assert.equal(address.props.state, "SP");
    assert.equal(address.props.zipCode, "01000-000");
  });

  it("should throw when street is empty", () => {
    const addressId = new AddressId("addr-1");

    assert.throws(
      () => Address.create(addressId, "", "123", "Sao Paulo", "SP", "01000-000"),
      { message: "Street cannot be empty" },
    );
  });

  it("should throw when city is empty", () => {
    const addressId = new AddressId("addr-1");

    assert.throws(
      () => Address.create(addressId, "Rua das Flores", "123", "", "SP", "01000-000"),
      { message: "City cannot be empty" },
    );
  });

  it("should throw when state is empty", () => {
    const addressId = new AddressId("addr-1");

    assert.throws(
      () => Address.create(addressId, "Rua das Flores", "123", "Sao Paulo", "", "01000-000"),
      { message: "State cannot be empty" },
    );
  });

  it("should throw when zipCode is empty", () => {
    const addressId = new AddressId("addr-1");

    assert.throws(
      () => Address.create(addressId, "Rua das Flores", "123", "Sao Paulo", "SP", ""),
      { message: "ZipCode cannot be empty" },
    );
  });

  it("should be equal to another address with the same id", () => {
    const sameId = new AddressId("addr-1");
    const firstAddress = Address.create(sameId, "Rua A", "1", "Sao Paulo", "SP", "01000-000");
    const secondAddress = Address.create(sameId, "Rua B", "2", "Rio de Janeiro", "RJ", "20000-000");

    assert.ok(firstAddress.equals(secondAddress));
  });

  it("should not be equal to an address with a different id", () => {
    const firstAddress = Address.create(new AddressId("addr-1"), "Rua A", "1", "Sao Paulo", "SP", "01000-000");
    const secondAddress = Address.create(new AddressId("addr-2"), "Rua A", "1", "Sao Paulo", "SP", "01000-000");

    assert.ok(!firstAddress.equals(secondAddress));
  });
});
