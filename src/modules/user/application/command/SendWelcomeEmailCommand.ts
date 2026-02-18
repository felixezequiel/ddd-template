import { UserId } from "../../domain/identifiers/UserId.ts";
import { Email } from "../../domain/valueObjects/Email.ts";

export class SendWelcomeEmailCommand {
  public readonly userId: UserId;
  public readonly email: Email;

  private constructor(userId: UserId, email: Email) {
    this.userId = userId;
    this.email = email;
  }

  public static of(userId: string, email: string): SendWelcomeEmailCommand {
    return new SendWelcomeEmailCommand(
      new UserId(userId),
      new Email(email),
    );
  }
}