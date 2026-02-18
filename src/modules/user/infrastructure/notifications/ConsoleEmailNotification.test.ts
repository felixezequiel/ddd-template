import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConsoleEmailNotification } from "./ConsoleEmailNotification.ts";
import type { LoggerPort } from "../../../../shared/ports/LoggerPort.ts";

class SpyLogger implements LoggerPort {
  public infoMessages: Array<{ message: string; context?: Record<string, unknown> | undefined }> = [];

  public info(message: string, context?: Record<string, unknown>): void {
    this.infoMessages.push({ message, context });
  }

  public warn(): void {}
  public error(): void {}
  public debug(): void {}
}

describe("ConsoleEmailNotification", () => {
  it("should log the welcome email details", async () => {
    const spyLogger = new SpyLogger();
    const notification = new ConsoleEmailNotification(spyLogger);

    await notification.sendWelcomeEmail("john@example.com", "user-123");

    assert.equal(spyLogger.infoMessages.length, 1);
    assert.equal(spyLogger.infoMessages[0]!.message, "Sending welcome email");
    assert.deepEqual(spyLogger.infoMessages[0]!.context, {
      email: "john@example.com",
      userId: "user-123",
    });
  });
});