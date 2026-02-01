import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  };

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

// Import after mocking
import {
  uploadVideoSession,
  uploadDocumentSession,
  importGoogleDoc,
  getGoogleAuthUrl,
  getGoogleAuthStatus,
  disconnectGoogle,
  listGoogleDriveFiles,
} from '../api';
import api from '../api';

describe('API functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadVideoSession', () => {
    it('sends correct FormData', async () => {
      (api.post as any).mockResolvedValue({ data: { id: 1, title: 'Video' } });

      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      await uploadVideoSession(file, 'My Video', 'meeting', 'feature/test');

      expect(api.post).toHaveBeenCalledWith(
        '/sessions/upload-video',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 300000,
        })
      );

      const formData = (api.post as any).mock.calls[0][1] as FormData;
      expect(formData.get('title')).toBe('My Video');
      expect(formData.get('session_type')).toBe('meeting');
      expect(formData.get('git_branch')).toBe('feature/test');
      expect(formData.get('video')).toBeInstanceOf(File);
    });

    it('omits git_branch when not provided', async () => {
      (api.post as any).mockResolvedValue({ data: { id: 1 } });

      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      await uploadVideoSession(file, 'Video');

      const formData = (api.post as any).mock.calls[0][1] as FormData;
      expect(formData.get('git_branch')).toBeNull();
    });
  });

  describe('uploadDocumentSession', () => {
    it('sends correct FormData', async () => {
      (api.post as any).mockResolvedValue({ data: { id: 2, title: 'Doc' } });

      const file = new File(['pdf'], 'design.pdf', { type: 'application/pdf' });
      await uploadDocumentSession(file, 'Design Doc', 'design', 'main');

      expect(api.post).toHaveBeenCalledWith(
        '/sessions/upload-document',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );

      const formData = (api.post as any).mock.calls[0][1] as FormData;
      expect(formData.get('title')).toBe('Design Doc');
      expect(formData.get('session_type')).toBe('design');
      expect(formData.get('document')).toBeInstanceOf(File);
    });
  });

  describe('importGoogleDoc', () => {
    it('sends correct JSON body', async () => {
      (api.post as any).mockResolvedValue({ data: { id: 3, title: 'Google Doc' } });

      await importGoogleDoc('doc-123', 'My Google Doc', 'design', 'main');

      expect(api.post).toHaveBeenCalledWith('/google/docs/import', {
        doc_id: 'doc-123',
        title: 'My Google Doc',
        session_type: 'design',
        git_branch: 'main',
      });
    });
  });

  describe('Google OAuth functions', () => {
    it('getGoogleAuthUrl calls correct endpoint', async () => {
      (api.get as any).mockResolvedValue({ data: { authorization_url: 'https://...' } });
      await getGoogleAuthUrl();
      expect(api.get).toHaveBeenCalledWith('/google/connect');
    });

    it('getGoogleAuthStatus calls correct endpoint', async () => {
      (api.get as any).mockResolvedValue({ data: { connected: true } });
      await getGoogleAuthStatus();
      expect(api.get).toHaveBeenCalledWith('/google/status');
    });

    it('disconnectGoogle calls correct endpoint', async () => {
      (api.delete as any).mockResolvedValue({ data: { status: 'disconnected' } });
      await disconnectGoogle();
      expect(api.delete).toHaveBeenCalledWith('/google/disconnect');
    });

    it('listGoogleDriveFiles calls with query param', async () => {
      (api.get as any).mockResolvedValue({ data: [] });
      await listGoogleDriveFiles('design');
      expect(api.get).toHaveBeenCalledWith('/google/drive/files', { params: { query: 'design' } });
    });

    it('listGoogleDriveFiles calls without query when empty', async () => {
      (api.get as any).mockResolvedValue({ data: [] });
      await listGoogleDriveFiles();
      expect(api.get).toHaveBeenCalledWith('/google/drive/files', { params: {} });
    });
  });
});
