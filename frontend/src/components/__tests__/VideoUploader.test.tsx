import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoUploader } from '../VideoUploader';

// Mock framer-motion to avoid animation complexity in tests
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
const mockUploadVideoSession = vi.fn();
vi.mock('@/lib/api', () => ({
  uploadVideoSession: (...args: any[]) => mockUploadVideoSession(...args),
}));

function createVideoFile(name = 'test.mp4', size = 1024, type = 'video/mp4'): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe('VideoUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders drop zone in idle state', () => {
    render(<VideoUploader />);
    expect(screen.getByText(/drop video here or click to browse/i)).toBeInTheDocument();
    expect(screen.getByText(/MP4, WebM, MOV, AVI, MPEG up to 500MB/i)).toBeInTheDocument();
  });

  it('accepts valid video file', async () => {
    render(<VideoUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createVideoFile();

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('test.mp4')).toBeInTheDocument();
    });
  });

  it('rejects non-video file', async () => {
    render(<VideoUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['text'], 'doc.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/unsupported format/i)).toBeInTheDocument();
    });
  });

  it('rejects oversized file', async () => {
    render(<VideoUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // 501 MB
    const file = createVideoFile('big.mp4', 501 * 1024 * 1024);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });

  it('shows file info after selection', async () => {
    render(<VideoUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createVideoFile('recording.mp4', 5 * 1024 * 1024);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('recording.mp4')).toBeInTheDocument();
      expect(screen.getByText(/5\.0 MB/)).toBeInTheDocument();
    });
  });

  it('disables upload without title', async () => {
    render(<VideoUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createVideoFile();

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('test.mp4')).toBeInTheDocument();
    });

    // Clear the auto-filled title
    const titleInput = screen.getByLabelText(/session title/i);
    await userEvent.clear(titleInput);

    const uploadButton = screen.getByRole('button', { name: /upload & analyze/i });
    expect(uploadButton).toBeDisabled();
  });

  it('calls uploadVideoSession on submit', async () => {
    const onSessionCreated = vi.fn();
    mockUploadVideoSession.mockResolvedValue({ id: 1, title: 'Test Video' });

    render(<VideoUploader onSessionCreated={onSessionCreated} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createVideoFile();

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('test')).toBeInTheDocument();
    });

    const uploadButton = screen.getByRole('button', { name: /upload & analyze/i });
    await userEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockUploadVideoSession).toHaveBeenCalledWith(
        file,
        'test',
        'coding',
        undefined
      );
    });
  });

  it('shows success state and calls onSessionCreated', async () => {
    const onSessionCreated = vi.fn();
    mockUploadVideoSession.mockResolvedValue({ id: 1, title: 'Test Video' });

    render(<VideoUploader onSessionCreated={onSessionCreated} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createVideoFile();

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('test')).toBeInTheDocument();
    });

    const uploadButton = screen.getByRole('button', { name: /upload & analyze/i });
    await userEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/upload complete/i)).toBeInTheDocument();
    });

    // Wait for the setTimeout callback
    await waitFor(() => {
      expect(onSessionCreated).toHaveBeenCalledWith({ id: 1, title: 'Test Video' });
    }, { timeout: 3000 });
  });
});
