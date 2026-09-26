export type StoreCategory = {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
  image?: string | null;
  sort_order?: number;
};

function bySort(a: StoreCategory, b: StoreCategory) {
  return (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'ar');
}

export function rootCategories(list: StoreCategory[]): StoreCategory[] {
  return list.filter((c) => !c.parent_id).sort(bySort);
}

export function childrenOf(list: StoreCategory[], parentId: number | null): StoreCategory[] {
  return list.filter((c) => (c.parent_id ?? null) === parentId).sort(bySort);
}

export function hasChildren(list: StoreCategory[], id: number): boolean {
  return list.some((c) => c.parent_id === id);
}

export function findCategory(list: StoreCategory[], id: number | null): StoreCategory | undefined {
  if (id == null) return undefined;
  return list.find((c) => c.id === id);
}

export function ancestorChain(list: StoreCategory[], id: number | null): StoreCategory[] {
  const chain: StoreCategory[] = [];
  let current = findCategory(list, id);
  while (current) {
    chain.unshift(current);
    current = current.parent_id ? findCategory(list, current.parent_id) : undefined;
  }
  return chain;
}
