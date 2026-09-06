export type LoginErrorAlertProps = {
  message: string | null;
};

/**
 * Inline OAuth error, rendered below the Google button. The design does not
 * draw this state — placement/tone (red-tinted, `role="alert"`) resolved in
 * clarifications.md. Renders nothing when there is no error.
 */
export function LoginErrorAlert({ message }: LoginErrorAlertProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="font-montserrat text-sm leading-5 font-bold text-[#FF8A80]"
    >
      {message}
    </p>
  );
}
