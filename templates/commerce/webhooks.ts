export async function handleBillingWebhook(eventId: string, seenIds: Set<string>) {
  if (seenIds.has(eventId)) return { deduplicated: true };
  seenIds.add(eventId);
  return { deduplicated: false };
}
