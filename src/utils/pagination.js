export const PAGE_SIZE = 10

export function paginate(items, page) {
  const start = (page - 1) * PAGE_SIZE
  return items.slice(start, start + PAGE_SIZE)
}

export function totalPages(itemCount) {
  return Math.max(1, Math.ceil(itemCount / PAGE_SIZE))
}