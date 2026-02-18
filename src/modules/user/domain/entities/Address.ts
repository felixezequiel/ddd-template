import { Entity } from "../../../../shared/domain/entities/Entity.ts";
import type { AddressId } from "../identifiers/AddressId.ts";

interface AddressProps {
  readonly street: string;
  readonly number: string;
  readonly city: string;
  readonly state: string;
  readonly zipCode: string;
}

export class Address extends Entity<AddressId, AddressProps> {
  public static create(
    id: AddressId,
    street: string,
    number: string,
    city: string,
    state: string,
    zipCode: string,
  ): Address {
    if (street.length === 0) {
      throw new Error("Street cannot be empty");
    }

    if (city.length === 0) {
      throw new Error("City cannot be empty");
    }

    if (state.length === 0) {
      throw new Error("State cannot be empty");
    }

    if (zipCode.length === 0) {
      throw new Error("ZipCode cannot be empty");
    }

    return new Address(id, { street, number, city, state, zipCode });
  }
}
