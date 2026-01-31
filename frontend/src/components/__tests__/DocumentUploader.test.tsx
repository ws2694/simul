import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentUploader } from '../DocumentUploader';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...filterMotionProps(props)}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...filterMotionProps(props)}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

function filterMotionProps(props: Record<string, any>) {
  const filtered: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    if (!['variants', 'initial', 'animate', 'exit', 'whileHover', 'whileTap', 'custom', 'transition'].includes(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock api
const mockUploadDocumentSession = vi.fn();
vi.mock('@/lib/api', () => ({
  uploadDocumentSession: (...args: any[]) => mockUploadDocumentSession(...args),
}));

describe('DocumentUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders drop zone', () => {
    render(<DocumentUploader />);
    expect(screen.getByText(/drop document here or click to browse/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF, TXT, DOCX up to 50MB/i)).toBeInTheDocument();
  });

  it('accepts PDF file', async () => {
    render(<DocumentUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['pdf content'], 'design.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('design.pdf')).toBeInTheDocument();
    });
  });

  it('accepts TXT file', async () => {
    render(<DocumentUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['text content'], 'notes.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('notes.txt')).toBeInTheDocument();
    });
  });

  it('accepts DOCX file', async () => {
    render(<DocumentUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['docx content'], 'proposal.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('proposal.docx')).toBeInTheDocument();
    });
  });

  it('rejects invalid file type', async () => {
    render(<DocumentUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['spreadsheet'], 'data.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/unsupported format/i)).toBeInTheDocument();
    });
  });

  it('calls uploadDocumentSession on submit', async () => {
    const onSessionCreated = vi.fn();
    mockUploadDocumentSession.mockResolvedValue({ id: 2, title: 'Design Doc' });

    render(<DocumentUploader onSessionCreated={onSessionCreated} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'design.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('design')).toBeInTheDocument();
    });

    const uploadButton = screen.getByRole('button', { name: /upload & analyze/i });
    await userEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockUploadDocumentSession).toHaveBeenCalledWith(
        file,
        'design',
        'design',
        undefined
      );
    });
  });
});
