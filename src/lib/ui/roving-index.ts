/**
 * Con trỏ chạy vòng cho danh sách item điều hướng bằng bàn phím
 * (roving tabindex, theo ARIA APG menu pattern).
 *
 * Thuần: không React, không DOM — nên `vitest` chạy được ở môi trường
 * `node` và coverage đo được (xem `vitest.config.ts`).
 */

/** Chỉ số cuối cùng, hoặc 0 khi danh sách rỗng. */
export function lastIndex(count: number): number {
  return count > 0 ? count - 1 : 0;
}

/** Item kế tiếp; chạm cuối thì vòng về đầu. */
export function nextIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  return current >= lastIndex(count) ? 0 : current + 1;
}

/** Item liền trước; chạm đầu thì vòng về cuối. */
export function prevIndex(current: number, count: number): number {
  if (count <= 0) return 0;
  return current <= 0 ? lastIndex(count) : current - 1;
}
