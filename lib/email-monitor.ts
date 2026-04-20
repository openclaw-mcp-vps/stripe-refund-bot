import Imap from "imap";

export type ProcessableEmail = {
  from: string;
  subject: string;
  body: string;
  messageId: string | null;
  receivedAt: string;
};

export type EmailMonitorConfig = {
  host: string;
  port: number;
  tls: boolean;
  user: string;
  password: string;
  mailbox?: string;
};

export function extractEmailAddress(input: string): string | null {
  const match = input.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return match?.[1]?.toLowerCase() ?? null;
}

export function looksLikeRefundRequest(subject: string, body: string): boolean {
  const text = `${subject} ${body}`.toLowerCase();
  return ["refund", "money back", "charged", "cancel"].some((keyword) => text.includes(keyword));
}

export function startImapRefundMonitor(config: EmailMonitorConfig, onEmail: (email: ProcessableEmail) => void) {
  const imap = new Imap({
    user: config.user,
    password: config.password,
    host: config.host,
    port: config.port,
    tls: config.tls,
    autotls: "always"
  });

  const mailbox = config.mailbox ?? "INBOX";

  function processUnseen() {
    imap.search(["UNSEEN"], (searchErr, ids) => {
      if (searchErr || ids.length === 0) {
        return;
      }

      const fetcher = imap.fetch(ids, { bodies: "" });

      fetcher.on("message", (message) => {
        let rawBody = "";
        let from = "";
        let subject = "";
        let messageId: string | null = null;

        message.on("body", (stream) => {
          stream.on("data", (chunk: Buffer) => {
            rawBody += chunk.toString("utf8");
          });
        });

        message.once("attributes", (attrs) => {
          messageId = attrs.uid ? `imap-${attrs.uid}` : null;
        });

        message.once("end", () => {
          const parsedHeader = Imap.parseHeader(rawBody);
          from = parsedHeader.from?.[0] ?? "";
          subject = parsedHeader.subject?.[0] ?? "Refund request";

          if (!looksLikeRefundRequest(subject, rawBody)) {
            return;
          }

          onEmail({
            from,
            subject,
            body: rawBody,
            messageId,
            receivedAt: new Date().toISOString()
          });
        });
      });
    });
  }

  imap.once("ready", () => {
    imap.openBox(mailbox, false, (openErr) => {
      if (openErr) {
        return;
      }
      processUnseen();
    });

    imap.on("mail", () => {
      processUnseen();
    });
  });

  imap.connect();

  return {
    stop: () => imap.end()
  };
}
