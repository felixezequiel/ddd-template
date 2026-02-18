import type { UseCaseResult } from "../../../../shared/application/UseCase.ts";
import type { SendWelcomeEmailPort } from "../port/primary/SendWelcomeEmailPort.ts";
import type { EmailNotificationPort } from "../port/secondary/EmailNotificationPort.ts";
import type { SendWelcomeEmailCommand } from "../command/SendWelcomeEmailCommand.ts";

export class SendWelcomeEmailUseCase implements SendWelcomeEmailPort {
  private readonly emailNotification: EmailNotificationPort;

  constructor(emailNotification: EmailNotificationPort) {
    this.emailNotification = emailNotification;
  }

  public async execute(command: SendWelcomeEmailCommand): Promise<UseCaseResult<void>> {
    await this.emailNotification.sendWelcomeEmail(
      command.email.props.value,
      command.userId.value,
    );

    return { result: undefined, aggregates: [] };
  }
}