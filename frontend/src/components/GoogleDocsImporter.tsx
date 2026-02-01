'use client';

import { useState, useEffect } from 'react';
import { FileText, CloudDownload } from 'lucide-react';
import { getGoogleAuthStatus } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <FileText className="h-4 w-4 text-amber-600" />
          </div>
          Import Document
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="drive" className="gap-2">
              <CloudDownload className="h-4 w-4" />
              Google Drive
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <FileText className="h-4 w-4" />
              File Upload
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
            <DocumentUploader onSessionCreated={onSessionCreated} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
