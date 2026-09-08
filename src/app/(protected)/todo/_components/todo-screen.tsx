export type TodoScreenProps = {
  greeting: string;
  logoutLabel: string;
  logoutAction: (formData: FormData) => void | Promise<void>;
};

/**
 * Phần trình bày thuần của `/todo` (FR-301/FR-302, US002_LoginWithGoogle), tách khỏi `app/todo/page.tsx` để
 * Storybook dựng được — component gốc phải đợi dữ liệu xong mới render nên
 * Storybook không render trực tiếp được. Component này render ngay, không
 * đổi ranh giới client/server, không biết gì về tầng xác thực hay tầng đa
 * ngôn ngữ của ứng dụng: mọi nội dung và hành vi đều đi qua props. Guard xác
 * thực (`getUser()`) vẫn nằm nguyên ở `app/todo/page.tsx` — component trình
 * bày không được quyết định ai xem được gì.
 */
export function TodoScreen({
  greeting,
  logoutLabel,
  logoutAction,
}: TodoScreenProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">{greeting}</h1>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-full bg-foreground px-5 py-2 text-background"
        >
          {logoutLabel}
        </button>
      </form>
    </main>
  );
}
