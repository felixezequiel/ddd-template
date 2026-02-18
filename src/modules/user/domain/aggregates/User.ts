import { AggregateRoot } from "../../../../shared/domain/aggregates/AggregateRoot.ts";
import { UserCreatedEvent } from "../events/UserCreatedEvent.ts";
import type { Email } from "../valueObjects/Email.ts";
import type { UserId } from "../identifiers/UserId.ts";

interface UserProps {
  readonly name: string;
  readonly email: Email;
}

export class User extends AggregateRoot<UserId, UserProps> {
  public static create(id: UserId, name: string, email: Email): User {
    const user = new User(id, { name, email });
    user.addDomainEvent(new UserCreatedEvent(id.value, email.props.value));
    return user;
  }
}
