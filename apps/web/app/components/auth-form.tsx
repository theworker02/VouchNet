'use client';

import type { KeyboardEvent, ReactNode } from 'react';

type AuthFormProps = {
  action: string;
  children: ReactNode;
};

function isTextEntry(element: EventTarget | null): element is HTMLInputElement {
  return (
    element instanceof HTMLInputElement &&
    !['button', 'checkbox', 'hidden', 'radio', 'reset', 'submit'].includes(element.type)
  );
}

/**
 * Pressing Enter in a non-final credential field should behave like advancing to the next field.
 * The final field intentionally retains native submit behavior for keyboard-only sign-in.
 */
export function AuthForm({ action, children }: AuthFormProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (
      event.key !== 'Enter' ||
      event.nativeEvent.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      !isTextEntry(event.target)
    ) {
      return;
    }

    const fields = Array.from(event.currentTarget.elements).filter(
      (element): element is HTMLInputElement =>
        element instanceof HTMLInputElement &&
        !element.disabled &&
        element.type !== 'hidden' &&
        !['checkbox', 'radio'].includes(element.type),
    );
    const index = fields.indexOf(event.target);
    const nextField = fields[index + 1];

    if (nextField !== undefined) {
      event.preventDefault();
      nextField.focus();
    }
  }

  return (
    <form action={action} method="post" onKeyDown={handleKeyDown}>
      {children}
    </form>
  );
}
