import { validateApp } from "../../shared/design";
import { screenDimensions } from "../../shared/product";
import type { PersistedState } from "../workspace/store";
import { ProjectDataError } from "./types";

// JSON preserves the existing editor schema, including nested arrays. Chunk
// documents avoid Firestore's document-size, map-depth and nested-array limits.
export const CHUNK_BYTES = 240_000;
export const MAX_PAYLOAD_BYTES = 6_000_000;
export function validateSnapshot(snapshot: PersistedState) {
  if (
    !snapshot ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(snapshot.projectId) ||
    typeof snapshot.projectName !== "string" ||
    snapshot.projectName.length > 200 ||
    !Array.isArray(snapshot.screens) ||
    !Array.isArray(snapshot.messages) ||
    !Array.isArray(snapshot.files) ||
    !snapshot.components ||
    !snapshot.tokens ||
    ![null, "mobile_app", "website"].includes(snapshot.productType)
  )
    throw new ProjectDataError(
      "The project snapshot is invalid. Your current editor state has been retained.",
    );
  if (snapshot.designSystem) {
    if (!snapshot.productType)
      throw new ProjectDataError(
        "The design needs a project type before it can be saved.",
      );
    validateApp({
      productType: snapshot.productType,
      name: snapshot.projectName,
      designSystem: {
        ...snapshot.designSystem,
        colors: {
          ...snapshot.designSystem.colors,
          ...Object.fromEntries(
            Object.entries(snapshot.tokens).filter(
              ([, value]) => typeof value === "string",
            ),
          ),
        },
      },
      screens: snapshot.screens.map((screen) => ({
        id: screen.id,
        name: screen.label,
        ...screenDimensions(screen, snapshot.productType),
        background: screen.background ?? snapshot.tokens.background,
        backgroundToken: screen.backgroundToken,
        components: screen.components.map((id) => snapshot.components[id]),
      })),
    });
  } else if (
    snapshot.screens.length ||
    Object.keys(snapshot.components).length
  ) {
    throw new ProjectDataError(
      "An incomplete design cannot be saved as completed output.",
    );
  }
}
export function splitJson(value: unknown): string[] {
  const json = JSON.stringify(value, (_key, item) => {
    if (typeof item === "string" && /^(data:|blob:)/i.test(item))
      throw new ProjectDataError(
        "This project contains an embedded file or temporary image URL. Use a hosted asset URL before saving; binary files are not stored in Firestore.",
      );
    return item;
  });
  const bytes = new TextEncoder().encode(json);
  if (bytes.length > MAX_PAYLOAD_BYTES)
    throw new ProjectDataError(
      "This project section exceeds the 6 MB save limit. Reduce its size before saving. Your work is retained on this device.",
    );
  const parts: string[] = [];
  for (let start = 0; start < bytes.length; ) {
    let end = Math.min(start + CHUNK_BYTES, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes.slice(start, end)),
    );
    start = end;
  }
  return parts;
}
export function encodeSnapshot(snapshot: PersistedState) {
  validateSnapshot(snapshot);
  const { messages, ...design } = snapshot;
  if(design.generationArtifact){const {designMd,...metadata}=design.generationArtifact;design.generationArtifact={...metadata,designMd:undefined} as unknown as typeof design.generationArtifact;}
  return {
    design: splitJson(design),
    conversation: splitJson(messages),
    status: Object.keys(snapshot.components).length
      ? ("ready" as const)
      : ("draft" as const),
  };
}
export function decodeSnapshot(
  id: string,
  design: string[],
  conversation: string[],
): PersistedState {
  const snapshot = {
    ...JSON.parse(design.join("")),
    messages: JSON.parse(conversation.join("")),
  } as PersistedState;
  if (snapshot.projectId !== id)
    throw new ProjectDataError(
      "The saved project ID does not match its document.",
    );
  validateSnapshot(snapshot);
  return snapshot;
}
