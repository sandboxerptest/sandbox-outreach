import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

interface MailerSettings {
  emailProvider?: string;
  // Gmail
  gmailClientId?: string;
  gmailClientSecret?: string;
  gmailRefreshToken?: string;
  gmailSenderEmail?: string;
  // O365
  o365ClientId?: string;
  o365ClientSecret?: string;
  o365TenantId?: string;
  o365SenderEmail?: string;
  // General
  defaultFromName?: string;
}

interface ContactData {
  firstName: string;
  lastName: string;
  email: string;
  company?: string | null;
  title?: string | null;
}

export function createTransport(settings: MailerSettings): Transporter | null {
  const provider = settings.emailProvider || "gmail";

  if (provider === "gmail") {
    if (!settings.gmailClientId || !settings.gmailClientSecret || !settings.gmailRefreshToken) {
      return null;
    }
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        type: "OAuth2",
        user: settings.gmailSenderEmail || "",
        clientId: settings.gmailClientId,
        clientSecret: settings.gmailClientSecret,
        refreshToken: settings.gmailRefreshToken,
      },
    });
  }

  if (provider === "office365") {
    if (!settings.o365ClientId || !settings.o365ClientSecret) {
      return null;
    }
    return nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        type: "OAuth2",
        user: settings.o365SenderEmail || "",
        clientId: settings.o365ClientId,
        clientSecret: settings.o365ClientSecret,
        // For O365 with client credentials, tenant-level auth may require
        // additional token exchange — this setup works for delegated auth
      },
    });
  }

  return null;
}

export function getSenderAddress(settings: MailerSettings): string {
  const provider = settings.emailProvider || "gmail";
  const email = provider === "gmail"
    ? settings.gmailSenderEmail
    : settings.o365SenderEmail;
  const name = settings.defaultFromName || "Sandbox Outreach";
  return email ? `"${name}" <${email}>` : `"${name}" <noreply@sandbox.local>`;
}

export function applyMergeFields(text: string, contact: ContactData): string {
  return text
    .replace(/\{\{firstName\}\}/g, contact.firstName || "")
    .replace(/\{\{lastName\}\}/g, contact.lastName || "")
    .replace(/\{\{email\}\}/g, contact.email || "")
    .replace(/\{\{company\}\}/g, contact.company || "")
    .replace(/\{\{title\}\}/g, contact.title || "")
    .replace(/\{\{fullName\}\}/g, `${contact.firstName || ""} ${contact.lastName || ""}`.trim());
}

export async function sendEmail(
  transport: Transporter,
  to: string,
  subject: string,
  html: string,
  from: string,
  replyToMessageId?: string,
): Promise<{ messageId: string }> {
  const mailOptions: nodemailer.SendMailOptions = {
    from,
    to,
    subject,
    html,
  };

  // For forward/reply-style emails, set In-Reply-To header
  if (replyToMessageId) {
    mailOptions.headers = {
      "In-Reply-To": replyToMessageId,
      "References": replyToMessageId,
    };
  }

  const info = await transport.sendMail(mailOptions);
  return { messageId: info.messageId };
}

// ─── Tracking Injection ────────────────────────────────────────

/**
 * Injects open-tracking pixel and rewrites links for click tracking.
 * @param html - The email body HTML
 * @param sendId - The EmailSend record ID
 * @param baseUrl - The app's public URL (e.g. https://your-app.com)
 */
export function injectTracking(html: string, sendId: string, baseUrl: string): string {
  let tracked = html;

  // Rewrite links for click tracking
  // Matches href="http..." or href='http...' in anchor tags
  tracked = tracked.replace(
    /href=["'](https?:\/\/[^"']+)["']/gi,
    (match, url) => {
      // Don't track unsubscribe links or mailto links
      if (url.includes("unsubscribe") || url.startsWith("mailto:")) return match;
      const trackUrl = `${baseUrl}/api/track/click?id=${encodeURIComponent(sendId)}&url=${encodeURIComponent(url)}`;
      return `href="${trackUrl}"`;
    }
  );

  // Inject open-tracking pixel before </body> or at the end
  const pixel = `<img src="${baseUrl}/api/track/open?id=${encodeURIComponent(sendId)}" width="1" height="1" style="display:none;border:0;" alt="" />`;
  if (tracked.includes("</body>")) {
    tracked = tracked.replace("</body>", `${pixel}</body>`);
  } else {
    tracked += pixel;
  }

  return tracked;
}

/**
 * Gets the base URL for tracking links.
 * Uses APP_URL env var, or falls back to localhost in dev.
 */
export function getTrackingBaseUrl(): string {
  return process.env.APP_URL || "http://localhost:3100";
}

export function isTransportConfigured(settings: MailerSettings): boolean {
  const provider = settings.emailProvider || "gmail";
  if (provider === "gmail") {
    return !!(settings.gmailClientId && settings.gmailClientSecret && settings.gmailRefreshToken && settings.gmailSenderEmail);
  }
  if (provider === "office365") {
    return !!(settings.o365ClientId && settings.o365ClientSecret && settings.o365SenderEmail);
  }
  return false;
}
