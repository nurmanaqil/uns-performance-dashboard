import type { EntityOption } from "./types.ts";

// Verified against AIESEC Dev Guide "List of Office IDs"
export const INDONESIA_ENTITIES: EntityOption[] = [
  { id: 6, name: "AIESEC in UNS", type: "LC", parentMcId: 1539 },
  { id: 1539, name: "AIESEC in Indonesia (MC)", type: "MC", parentMcId: 1539 },
  { id: 1895, name: "AIESEC in Unsri", type: "LC", parentMcId: 1539 },
  { id: 2014, name: "AIESEC in Unsoed", type: "LC", parentMcId: 1539 },
];

export function resolveEntity(
  officeId: number,
  customName?: string
): EntityOption {
  const known = INDONESIA_ENTITIES.find((e) => e.id === officeId);
  if (known) return known;

  return {
    id: officeId,
    name: customName || `Office #${officeId}`,
    type: officeId === 1539 ? "MC" : "LC",
    parentMcId: 1539,
  };
}
