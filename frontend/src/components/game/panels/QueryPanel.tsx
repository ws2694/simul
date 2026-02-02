'use client';

import { Bot } from 'lucide-react';
import FloatingPanel from '../FloatingPanel';
import { BotQuery } from '@/components/BotQuery';

interface QueryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QueryPanel({ isOpen, onClose }: QueryPanelProps) {
  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Query Bot"
      icon={<Bot className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #c4b5e0, #9b7ed4)"
      width="560px"
      maxHeight="85vh"
    >
      <div className="[&_.card]:border-0 [&_.card]:shadow-none [&_.card]:bg-transparent [&_.card-header]:px-0 [&_.card-header]:pt-0 [&_.card-content]:px-0">
        <BotQuery mode="personal" />
      </div>
    </FloatingPanel>
  );
}
