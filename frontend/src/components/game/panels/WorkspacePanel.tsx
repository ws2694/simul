'use client';

import { useState } from 'react';
import { Laptop, Mic, Video, FileText } from 'lucide-react';
import FloatingPanel from '../FloatingPanel';
import { AudioRecorder } from '@/components/AudioRecorder';
import { VideoUploader } from '@/components/VideoUploader';
import { GoogleDocsImporter } from '@/components/GoogleDocsImporter';

interface WorkspacePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated?: (session: any) => void;
}

const tabs = [
  { id: 'record', label: 'Record', icon: Mic },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'document', label: 'Document', icon: FileText },
];

export default function WorkspacePanel({
  isOpen,
  onClose,
  onSessionCreated
}: WorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState('record');

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
              onClick={() => setActiveTab(tab.id)}
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
        {activeTab === 'record' && (
          <AudioRecorder onSessionCreated={onSessionCreated} />
        )}
        {activeTab === 'video' && (
          <VideoUploader onSessionCreated={onSessionCreated} />
        )}
        {activeTab === 'document' && (
          <GoogleDocsImporter onSessionCreated={onSessionCreated} />
        )}
      </div>
    </FloatingPanel>
  );
}
