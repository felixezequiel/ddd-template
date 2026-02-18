import type { EmailNotificationPort } from "../../application/port/secondary/EmailNotificationPort.ts";
import type { LoggerPort } from "../../../../shared/ports/LoggerPort.ts";

export class ConsoleEmailNotification implements EmailNotificationPort {
  private readonly logger: LoggerPort;

  constructor(logger: LoggerPort) {
    this.logger = logger;
  }

  public async sendWelcomeEmail(email: string, userId: string): Promise<void> {
    this.logger.info("Sending welcome email", { email, userId });
  }
}