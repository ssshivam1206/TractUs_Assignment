import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    React.createElement('a', { href, ...props }, children)
  ),
}));
