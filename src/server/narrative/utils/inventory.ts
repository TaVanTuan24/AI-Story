import type { InventoryItem } from "@/server/narrative/types";
import { ContradictoryStateUpdateError } from "@/server/narrative/errors";

export function addInventoryItem(items: InventoryItem[], incoming: InventoryItem) {
  const existing = items.find((item) => item.id === incoming.id);

  if (!existing) {
    return [...items, incoming];
  }

  return items.map((item) =>
    item.id === incoming.id
      ? { ...item, quantity: item.quantity + incoming.quantity }
      : item,
  );
}

export function removeInventoryItem(items: InventoryItem[], outgoing: InventoryItem) {
  const existing = items.find((item) => item.id === outgoing.id);

  if (!existing || existing.quantity < outgoing.quantity) {
    throw new ContradictoryStateUpdateError(
      `Cannot remove ${outgoing.quantity} of "${outgoing.id}" from inventory.`,
    );
  }

  return items
    .map((item) =>
      item.id === outgoing.id
        ? { ...item, quantity: item.quantity - outgoing.quantity }
        : item,
    )
    .filter((item) => item.quantity > 0);
}
