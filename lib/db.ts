import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { AccessGrant, AppDatabase, EventLogEntry, RefundRequest } from "@/lib/types";

const DB_FILE_PATH = path.join(process.cwd(), "data", "refundbot-db.json");

function defaultDb(): AppDatabase {
  return {
    refundRequests: [],
    accessGrants: [],
    eventLog: []
  };
}

async function ensureDbFile() {
  const folder = path.dirname(DB_FILE_PATH);
  await fs.mkdir(folder, { recursive: true });
  try {
    await fs.access(DB_FILE_PATH);
  } catch {
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(defaultDb(), null, 2), "utf8");
  }
}

async function readDb(): Promise<AppDatabase> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_FILE_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw) as Partial<AppDatabase>;
    return {
      refundRequests: parsed.refundRequests ?? [],
      accessGrants: parsed.accessGrants ?? [],
      eventLog: parsed.eventLog ?? []
    };
  } catch {
    const reset = defaultDb();
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(reset, null, 2), "utf8");
    return reset;
  }
}

async function writeDb(db: AppDatabase) {
  await fs.writeFile(DB_FILE_PATH, JSON.stringify(db, null, 2), "utf8");
}

let mutationQueue: Promise<void> = Promise.resolve();

async function mutateDb<T>(mutator: (db: AppDatabase) => Promise<T> | T): Promise<T> {
  const task = mutationQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  });

  mutationQueue = task.then(
    () => undefined,
    () => undefined
  );

  return task;
}

export async function getDbSnapshot(): Promise<AppDatabase> {
  return readDb();
}

export async function appendEventLog(entry: Omit<EventLogEntry, "id" | "createdAt">) {
  await mutateDb((db) => {
    db.eventLog.unshift({
      id: `evt_${randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...entry
    });

    if (db.eventLog.length > 800) {
      db.eventLog = db.eventLog.slice(0, 800);
    }
  });
}

export async function createRefundRequest(
  payload: Omit<
    RefundRequest,
    "id" | "createdAt" | "updatedAt" | "refundId" | "refundFailureReason" | "responseDraft" | "responseSentAt"
  >
) {
  const now = new Date().toISOString();

  return mutateDb((db) => {
    const request: RefundRequest = {
      ...payload,
      id: `rr_${randomUUID()}`,
      createdAt: now,
      updatedAt: now,
      refundId: null,
      refundFailureReason: null,
      responseDraft: null,
      responseSentAt: null
    };

    db.refundRequests.unshift(request);
    return request;
  });
}

export async function getRefundRequestById(id: string) {
  const db = await readDb();
  return db.refundRequests.find((item) => item.id === id) ?? null;
}

export async function updateRefundRequest(
  id: string,
  updater: (request: RefundRequest) => RefundRequest | Promise<RefundRequest>
): Promise<RefundRequest | null> {
  return mutateDb(async (db) => {
    const index = db.refundRequests.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    const updated = await updater(db.refundRequests[index]);
    db.refundRequests[index] = {
      ...updated,
      updatedAt: new Date().toISOString()
    };

    return db.refundRequests[index];
  });
}

export async function listRefundRequests(limit = 100): Promise<RefundRequest[]> {
  const db = await readDb();
  return db.refundRequests.slice(0, limit);
}

export async function upsertAccessGrant(grant: AccessGrant) {
  await mutateDb((db) => {
    const existing = db.accessGrants.find((item) => item.email === grant.email);
    if (existing) {
      existing.grantedAt = grant.grantedAt;
      existing.orderId = grant.orderId;
      existing.eventName = grant.eventName;
      existing.source = grant.source;
      return;
    }

    db.accessGrants.push(grant);
  });
}

export async function hasAccessGrant(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const db = await readDb();
  return db.accessGrants.some((item) => item.email === normalized);
}
