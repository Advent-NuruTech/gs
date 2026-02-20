import { FirebaseApp } from "firebase/app";

import {
  firebaseRequest,
  getFirebaseProjectId,
} from "@/lib/firebase/sdk/internal";

export interface Firestore {
  app: FirebaseApp;
}

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { timestampValue: string };

type FirestoreDoc = {
  name: string;
  createTime?: string;
  updateTime?: string;
  fields?: Record<string, FirestoreValue>;
};

export interface DocumentData {
  [key: string]: unknown;
}

export interface CollectionReference {
  type: "collection";
  path: string;
}

export interface DocumentReference {
  type: "document";
  path: string;
  id: string;
}

type WhereOperator = "==" | ">" | ">=" | "<" | "<=";

type QueryConstraint =
  | { type: "where"; field: string; operator: WhereOperator; value: unknown }
  | { type: "orderBy"; field: string; direction: "asc" | "desc" }
  | { type: "limit"; value: number }
  | { type: "startAfter"; value: QueryDocumentSnapshot };

export interface QueryReference {
  type: "query";
  basePath: string;
  constraints: QueryConstraint[];
}

export class FireTimestamp {
  private readonly isoString: string;

  constructor(isoString: string) {
    this.isoString = isoString;
  }

  toDate() {
    return new Date(this.isoString);
  }

  toString() {
    return this.isoString;
  }
}

export class QueryDocumentSnapshot {
  readonly id: string;
  private readonly _data: DocumentData;
  readonly ref: DocumentReference;

  constructor(id: string, data: DocumentData, ref: DocumentReference) {
    this.id = id;
    this._data = data;
    this.ref = ref;
  }

  data() {
    return this._data;
  }
}

export class DocumentSnapshot {
  readonly id: string;
  private readonly _data: DocumentData | undefined;
  readonly ref: DocumentReference;

  constructor(id: string, data: DocumentData | undefined, ref: DocumentReference) {
    this.id = id;
    this._data = data;
    this.ref = ref;
  }

  exists() {
    return Boolean(this._data);
  }

  data() {
    return this._data;
  }
}

export interface QuerySnapshot {
  docs: QueryDocumentSnapshot[];
  size: number;
}

let firestoreInstance: Firestore | null = null;

function projectBaseUrl(): string {
  const projectId = getFirebaseProjectId();
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

function docUrl(path: string) {
  return `${projectBaseUrl()}/${path}`;
}

function collectionUrl(path: string) {
  return `${projectBaseUrl()}/${path}`;
}

function pathLastSegment(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? "";
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || typeof value === "undefined") {
    return { nullValue: null };
  }

  if (value instanceof FireTimestamp) {
    return { timestampValue: value.toString() };
  }

  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }

  const mapFields: Record<string, FirestoreValue> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    mapFields[key] = toFirestoreValue(item);
  }
  return { mapValue: { fields: mapFields } };
}

function fromFirestoreValue(value?: FirestoreValue): unknown {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return new FireTimestamp(value.timestampValue);
  if ("arrayValue" in value) {
    return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  }
  if ("mapValue" in value) {
    const map: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value.mapValue.fields ?? {})) {
      map[key] = fromFirestoreValue(item);
    }
    return map;
  }
  return undefined;
}

function normalizeSpecialValues(
  input: Record<string, unknown>,
  currentData: Record<string, unknown> = {},
): Record<string, unknown> {
  const now = new FireTimestamp(new Date().toISOString());
  const output: Record<string, unknown> = { ...input };
  for (const [key, value] of Object.entries(output)) {
    if ((value as { __serverTimestamp?: boolean })?.__serverTimestamp) {
      output[key] = now;
      continue;
    }
    if ((value as { __arrayUnion?: unknown[] })?.__arrayUnion) {
      const unionValues = (value as { __arrayUnion: unknown[] }).__arrayUnion;
      const existing = Array.isArray(currentData[key]) ? (currentData[key] as unknown[]) : [];
      const merged = [...existing];
      for (const item of unionValues) {
        const exists = merged.some(
          (mergedItem) => JSON.stringify(mergedItem) === JSON.stringify(item),
        );
        if (!exists) merged.push(item);
      }
      output[key] = merged;
    }
  }
  return output;
}

function parseDocument(doc: FirestoreDoc): {
  id: string;
  path: string;
  data: DocumentData;
} {
  const data: DocumentData = {};
  for (const [key, value] of Object.entries(doc.fields ?? {})) {
    data[key] = fromFirestoreValue(value);
  }
  return {
    id: pathLastSegment(doc.name),
    path: doc.name.split("/documents/")[1] ?? "",
    data,
  };
}

function serializeData(data: Record<string, unknown>) {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(data)) {
    fields[key] = toFirestoreValue(value);
  }
  return { fields };
}

function compareValues(a: unknown, b: unknown) {
  const normalize = (value: unknown) => {
    if (value instanceof FireTimestamp) return value.toDate().getTime();
    return value;
  };
  const left = normalize(a);
  const right = normalize(b);
  if (left === right) return 0;
  if (typeof left === "number" && typeof right === "number") return left > right ? 1 : -1;
  return String(left) > String(right) ? 1 : -1;
}

function applyWhereConstraint(
  docs: QueryDocumentSnapshot[],
  constraint: Extract<QueryConstraint, { type: "where" }>,
) {
  return docs.filter((doc) => {
    const value = doc.data()[constraint.field];
    switch (constraint.operator) {
      case "==":
        return value === constraint.value;
      case ">":
        return compareValues(value, constraint.value) > 0;
      case ">=":
        return compareValues(value, constraint.value) >= 0;
      case "<":
        return compareValues(value, constraint.value) < 0;
      case "<=":
        return compareValues(value, constraint.value) <= 0;
      default:
        return false;
    }
  });
}

function applyOrderByConstraint(
  docs: QueryDocumentSnapshot[],
  constraint: Extract<QueryConstraint, { type: "orderBy" }>,
) {
  return [...docs].sort((a, b) => {
    const delta = compareValues(a.data()[constraint.field], b.data()[constraint.field]);
    return constraint.direction === "desc" ? -delta : delta;
  });
}

async function listCollectionDocuments(path: string): Promise<QueryDocumentSnapshot[]> {
  const response = await firebaseRequest<{ documents?: FirestoreDoc[] }>(
    collectionUrl(path),
    { auth: true },
  );

  return (response.documents ?? []).map((document) => {
    const parsed = parseDocument(document);
    return new QueryDocumentSnapshot(parsed.id, parsed.data, {
      type: "document",
      path: parsed.path,
      id: parsed.id,
    });
  });
}

export function getFirestore(app: FirebaseApp): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = { app };
  }
  return firestoreInstance;
}

export function collection(_db: Firestore, ...pathSegments: string[]): CollectionReference {
  return { type: "collection", path: pathSegments.join("/") };
}

export function doc(
  _db: Firestore,
  ...pathSegments: string[]
): DocumentReference {
  const path = pathSegments.join("/");
  return {
    type: "document",
    path,
    id: pathLastSegment(path),
  };
}

export function where(
  field: string,
  operator: WhereOperator,
  value: unknown,
): QueryConstraint {
  return { type: "where", field, operator, value };
}

export function orderBy(
  field: string,
  direction: "asc" | "desc" = "asc",
): QueryConstraint {
  return { type: "orderBy", field, direction };
}

export function limit(value: number): QueryConstraint {
  return { type: "limit", value };
}

export function startAfter(value: QueryDocumentSnapshot): QueryConstraint {
  return { type: "startAfter", value };
}

export function query(
  collectionRef: CollectionReference,
  ...constraints: QueryConstraint[]
): QueryReference {
  return {
    type: "query",
    basePath: collectionRef.path,
    constraints,
  };
}

export function serverTimestamp() {
  return { __serverTimestamp: true };
}

export function arrayUnion(...values: unknown[]) {
  return { __arrayUnion: values };
}

export async function getDoc(
  documentRef: DocumentReference,
): Promise<DocumentSnapshot> {
  try {
    const response = await firebaseRequest<FirestoreDoc>(docUrl(documentRef.path), {
      auth: true,
    });
    const parsed = parseDocument(response);
    return new DocumentSnapshot(parsed.id, parsed.data, {
      type: "document",
      path: parsed.path,
      id: parsed.id,
    });
  } catch {
    return new DocumentSnapshot(documentRef.id, undefined, documentRef);
  }
}

export async function getDocs(
  reference: QueryReference | CollectionReference,
): Promise<QuerySnapshot> {
  const basePath = reference.type === "query" ? reference.basePath : reference.path;
  let docs = await listCollectionDocuments(basePath);

  if (reference.type === "query") {
    for (const constraint of reference.constraints) {
      if (constraint.type === "where") {
        docs = applyWhereConstraint(docs, constraint);
      }
    }

    for (const constraint of reference.constraints) {
      if (constraint.type === "orderBy") {
        docs = applyOrderByConstraint(docs, constraint);
      }
    }

    for (const constraint of reference.constraints) {
      if (constraint.type === "startAfter") {
        const index = docs.findIndex((docSnap) => docSnap.id === constraint.value.id);
        docs = index >= 0 ? docs.slice(index + 1) : docs;
      }
    }

    const limitConstraint = reference.constraints.find(
      (constraint) => constraint.type === "limit",
    ) as Extract<QueryConstraint, { type: "limit" }> | undefined;
    if (limitConstraint) {
      docs = docs.slice(0, limitConstraint.value);
    }
  }

  return { docs, size: docs.length };
}

export async function addDoc(
  collectionRef: CollectionReference,
  data: Record<string, unknown>,
): Promise<DocumentReference> {
  const payload = serializeData(normalizeSpecialValues(data));
  const response = await firebaseRequest<FirestoreDoc>(collectionUrl(collectionRef.path), {
    method: "POST",
    body: payload,
    auth: true,
  });
  const parsed = parseDocument(response);
  return {
    type: "document",
    path: parsed.path,
    id: parsed.id,
  };
}

export async function setDoc(
  documentRef: DocumentReference,
  data: Record<string, unknown>,
  options?: { merge?: boolean },
): Promise<void> {
  let payloadData = data;

  if (options?.merge) {
    const existing = await getDoc(documentRef);
    const existingData = existing.exists() ? (existing.data() as Record<string, unknown>) : {};
    payloadData = { ...existingData, ...data };
  }

  const payload = serializeData(normalizeSpecialValues(payloadData));
  await firebaseRequest(docUrl(documentRef.path), {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}

export async function updateDoc(
  documentRef: DocumentReference,
  updates: Record<string, unknown>,
): Promise<void> {
  const existing = await getDoc(documentRef);
  if (!existing.exists()) {
    throw new Error("Document does not exist.");
  }
  const existingData = (existing.data() ?? {}) as Record<string, unknown>;
  const normalizedUpdates = normalizeSpecialValues(updates, existingData);
  const merged = { ...existingData, ...normalizedUpdates };
  const payload = serializeData(merged);

  await firebaseRequest(docUrl(documentRef.path), {
    method: "PATCH",
    body: payload,
    auth: true,
  });
}

export async function deleteDoc(documentRef: DocumentReference): Promise<void> {
  await firebaseRequest(docUrl(documentRef.path), {
    method: "DELETE",
    auth: true,
  });
}

export async function getCountFromServer(
  collectionRef: CollectionReference,
): Promise<{ data: () => { count: number } }> {
  const snapshot = await getDocs(collectionRef);
  return {
    data: () => ({ count: snapshot.size }),
  };
}
