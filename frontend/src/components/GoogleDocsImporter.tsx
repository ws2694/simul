'use client';

import { useState, useEffect } from 'react';
import { Cloud, Upload } from 'lucide-react';
import { getGoogleAuthStatus } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DocumentUploader } from '@/components/DocumentUploader';
import { DriveFilePicker } from '@/components/DriveFilePicker';
import { GoogleConnectPrompt } from '@/components/GoogleConnectPrompt';

interface GoogleDocsImporterProps {
  onSessionCreated?: (session: any) => void;
}

export function GoogleDocsImporter({ onSessionCreated }: GoogleDocsImporterProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<string>('upload');

  useEffect(() => {
    let mounted = true;
    getGoogleAuthStatus()
      .then((data) => {
        if (mounted) {
          setIsConnected(data.connected);
          if (data.connected) {
            setActiveTab('drive');
          }
        }
      })
      .catch(() => {
        if (mounted) setIsConnected(false);
      });
    return () => { mounted = false; };
  }, []);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="drive" className="gap-2">
          <Cloud className="h-4 w-4" />
          Google Drive
        </TabsTrigger>
        <TabsTrigger value="upload" className="gap-2">
          <Upload className="h-4 w-4" />
          From Device
        </TabsTrigger>
      </TabsList>

      <TabsContent value="drive">
        {isConnected === null ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Checking connection...
          </div>
        ) : isConnected ? (
          <DriveFilePicker onSessionCreated={onSessionCreated} />
        ) : (
          <GoogleConnectPrompt />
        )}
      </TabsContent>

      <TabsContent value="upload">
        <DocumentUploader onSessionCreated={onSessionCreated} showHeader={false} />
      </TabsContent>
    </Tabs>
  );
}
