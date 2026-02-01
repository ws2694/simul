import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoogleDocsImporter } from '../GoogleDocsImporter';

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

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock API
const mockGetGoogleAuthStatus = vi.fn();
const mockGetGoogleAuthUrl = vi.fn();
const mockListGoogleDriveFiles = vi.fn();
const mockImportGoogleDoc = vi.fn();
const mockUploadDocumentSession = vi.fn();

vi.mock('@/lib/api', () => ({
  getGoogleAuthStatus: (...args: any[]) => mockGetGoogleAuthStatus(...args),
  getGoogleAuthUrl: (...args: any[]) => mockGetGoogleAuthUrl(...args),
  listGoogleDriveFiles: (...args: any[]) => mockListGoogleDriveFiles(...args),
  importGoogleDoc: (...args: any[]) => mockImportGoogleDoc(...args),
  uploadDocumentSession: (...args: any[]) => mockUploadDocumentSession(...args),
}));

describe('GoogleDocsImporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload tab by default when not connected', async () => {
    mockGetGoogleAuthStatus.mockResolvedValue({ connected: false });

    render(<GoogleDocsImporter />);

    // Wait for auth check to complete
    await waitFor(() => {
      expect(mockGetGoogleAuthStatus).toHaveBeenCalled();
    });

    // Should show file upload tab content by default since not connected
    // The upload tab shows a DocumentUploader with a drop zone
    expect(screen.getByText(/drop document here or click to browse/i)).toBeInTheDocument();
  });

  it('renders drive tab when connected', async () => {
    mockGetGoogleAuthStatus.mockResolvedValue({ connected: true });
    mockListGoogleDriveFiles.mockResolvedValue([]);

    render(<GoogleDocsImporter />);

    // When connected, default tab switches to drive
    await waitFor(() => {
      expect(mockListGoogleDriveFiles).toHaveBeenCalled();
    });
  });

  it('shows connect prompt on drive tab when not connected', async () => {
    mockGetGoogleAuthStatus.mockResolvedValue({ connected: false });

    render(<GoogleDocsImporter />);

    await waitFor(() => {
      expect(mockGetGoogleAuthStatus).toHaveBeenCalled();
    });

    // Click the Google Drive tab
    const driveTab = screen.getByRole('tab', { name: /google drive/i });
    await userEvent.click(driveTab);

    // Should show connect prompt (heading + button both contain "Connect Google Account")
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /connect google account/i })).toBeInTheDocument();
      expect(screen.getByText(/connect your google account to import documents/i)).toBeInTheDocument();
    });
  });

  it('lists drive files when connected', async () => {
    mockGetGoogleAuthStatus.mockResolvedValue({ connected: true });
    mockListGoogleDriveFiles.mockResolvedValue([
      {
        id: 'doc-1',
        name: 'Design Document',
        modifiedTime: '2025-06-15T10:00:00Z',
        owners: ['user@example.com'],
      },
      {
        id: 'doc-2',
        name: 'Meeting Notes',
        modifiedTime: '2025-06-14T09:00:00Z',
        owners: ['other@example.com'],
      },
    ]);

    render(<GoogleDocsImporter />);

    await waitFor(() => {
      expect(screen.getByText('Design Document')).toBeInTheDocument();
      expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
    });
  });

  it('imports selected doc and calls onSessionCreated', async () => {
    const onSessionCreated = vi.fn();
    mockGetGoogleAuthStatus.mockResolvedValue({ connected: true });
    mockListGoogleDriveFiles.mockResolvedValue([
      {
        id: 'doc-1',
        name: 'Design Document',
        modifiedTime: '2025-06-15T10:00:00Z',
        owners: ['user@example.com'],
      },
    ]);
    mockImportGoogleDoc.mockResolvedValue({
      id: 42,
      title: 'Design Document',
      processing_status: 'pending',
      source_content_type: 'document',
    });

    render(<GoogleDocsImporter onSessionCreated={onSessionCreated} />);

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('Design Document')).toBeInTheDocument();
    });

    // Click file to select it
    await userEvent.click(screen.getByText('Design Document'));

    // Title should be pre-filled
    await waitFor(() => {
      expect(screen.getByDisplayValue('Design Document')).toBeInTheDocument();
    });

    // Click import button
    const importButton = screen.getByRole('button', { name: /import & analyze/i });
    await userEvent.click(importButton);

    await waitFor(() => {
      expect(mockImportGoogleDoc).toHaveBeenCalledWith(
        'doc-1',
        'Design Document',
        'design',
        undefined
      );
      expect(onSessionCreated).toHaveBeenCalledWith({
        id: 42,
        title: 'Design Document',
        processing_status: 'pending',
        source_content_type: 'document',
      });
    });
  });
});
