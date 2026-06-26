const sentSignalIds = new Set<string>();

export function wasSignalSent(id: string): boolean {
  return sentSignalIds.has(id);
}

export function markSignalSent(id: string): void {
  sentSignalIds.add(id);

  if (sentSignalIds.size > 500) {
    const [oldest] = sentSignalIds;
    if (oldest) sentSignalIds.delete(oldest);
  }
}
