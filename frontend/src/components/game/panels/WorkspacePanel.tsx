'use client';

import { useState } from 'react';
import { Laptop, Mic, Video, FileText, Upload, Circle, ArrowLeft } from 'lucide-react';
import FloatingPanel from '../FloatingPanel';
import { AudioRecorder } from '@/components/AudioRecorder';
import { VideoUploader } from '@/components/VideoUploader';
import { VideoRecorder } from '@/components/VideoRecorder';
import { GoogleDocsImporter } from '@/components/GoogleDocsImporter';

interface WorkspacePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: (session: any) => void;
}

const tabs = [
  { id: 'audio', label: 'Audio', icon: Mic },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'document', label: 'Document', icon: FileText },
];

type VideoMode = 'select' | 'upload' | 'record';

export default function WorkspacePanel({
  isOpen,
  onClose,
  onSessionCreated
}: WorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState('audio');
  const [videoMode, setVideoMode] = useState<VideoMode>('select');

  // Reset video mode when switching tabs
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'video') {
      setVideoMode('select');
    }
  };

  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Workspace"
      icon={<Laptop className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #a8d5ba, #7bc99a)"
      width="520px"
      maxHeight="85vh"
    >
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 mb-5 bg-cream rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-white text-game-text-dark shadow-game-card'
                  : 'text-game-text-light hover:text-game-text-dark'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="[&_.card]:border-lavender-light [&_.card]:bg-cream/50 [&_.card-header]:pb-3">
        {activeTab === 'audio' && (
          <AudioRecorder onSessionCreated={onSessionCreated} />
        )}

        {activeTab === 'video' && (
          <>
            {videoMode === 'select' && (
              <div className="space-y-4">
                <p className="text-sm text-game-text-light text-center">
                  Choose how you want to add a video
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setVideoMode('upload')}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-lavender-light bg-cream/30 hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                  >
                    <div className="p-3 rounded-full bg-blue-100">
                      <Upload className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-game-text-dark">Upload Video</p>
                      <p className="text-xs text-game-text-light">From your device</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setVideoMode('record')}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-lavender-light bg-cream/30 hover:border-rose-400 hover:bg-rose-50/50 transition-all"
                  >
                    <div className="p-3 rounded-full bg-rose-100">
                      <Circle className="h-6 w-6 text-rose-600" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-game-text-dark">Record Video</p>
                      <p className="text-xs text-game-text-light">Camera or screen</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {videoMode === 'upload' && (
              <div className="space-y-3">
                <button
                  onClick={() => setVideoMode('select')}
                  className="flex items-center gap-2 text-sm text-game-text-light hover:text-game-text-dark transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to options
                </button>
                <VideoUploader onSessionCreated={onSessionCreated} />
              </div>
            )}

            {videoMode === 'record' && (
              <div className="space-y-3">
                <button
                  onClick={() => setVideoMode('select')}
                  className="flex items-center gap-2 text-sm text-game-text-light hover:text-game-text-dark transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to options
                </button>
                <VideoRecorder onSessionCreated={onSessionCreated} />
              </div>
            )}
          </>
        )}

        {activeTab === 'document' && (
          <GoogleDocsImporter onSessionCreated={onSessionCreated} />
        )}
      </div>
    </FloatingPanel>
  );
}
