export interface EmailNotificationPort {
  sendWelcomeEmail(email: string, userId: string): Promise<void>;
}