import { Buffer } from "node:buffer";
import { google } from "googleapis";
import { getBaseUrl, getEnv } from "@/lib/env";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

export function createGoogleOAuthClient() {
  return new google.auth.OAuth2(
    getEnv("GOOGLE_CLIENT_ID"),
    getEnv("GOOGLE_CLIENT_SECRET"),
    `${getBaseUrl()}/api/gmail/callback`,
  );
}

export function buildGoogleConsentUrl(state: string) {
  const client = createGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
  });
}

export async function exchangeGoogleCode(code: string) {
  const client = createGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ auth: client, version: "v2" });
  const profile = await oauth2.userinfo.get();

  return {
    tokens,
    email: profile.data.email || "",
  };
}

export async function sendGmailMessage({
  accessToken,
  refreshToken,
  expiryDate,
  to,
  subject,
  body,
  threadId,
}: {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiryDate?: number | null;
  to: string;
  subject: string;
  body: string;
  threadId?: string | null;
}) {
  const client = createGoogleOAuthClient();
  client.setCredentials({
    access_token: accessToken || undefined,
    refresh_token: refreshToken || undefined,
    expiry_date: expiryDate || undefined,
  });

  const gmail = google.gmail({ version: "v1", auth: client });
  const mime = [
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    `To: ${to}`,
    `Subject: ${subject}`,
    "",
    body,
  ].join("\n");

  const raw = Buffer.from(mime)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      threadId: threadId || undefined,
    },
  });

  const tokenState = client.credentials;

  return {
    threadId: result.data.threadId || null,
    accessToken: tokenState.access_token || accessToken || null,
    refreshToken: tokenState.refresh_token || refreshToken || null,
    expiryDate: tokenState.expiry_date || expiryDate || null,
  };
}
