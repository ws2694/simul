'use client';

import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import FloatingPanel from '../FloatingPanel';
import { Input } from '@/components/ui/input';

interface SearchFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  domains: string[];
  selectedDomains: string[];
  onDomainToggle: (domain: string) => void;
  statuses: string[];
  selectedStatuses: string[];
  onStatusToggle: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const DOMAIN_COLORS: Record<string, string> = {
  backend: 'bg-mint hover:bg-mint-light',
  frontend: 'bg-lavender hover:bg-lavender-light',
  database: 'bg-soft-blue hover:bg-blue-200',
  security: 'bg-peach hover:bg-orange-200',
  devops: 'bg-soft-yellow hover:bg-yellow-200',
  api: 'bg-sky-300 hover:bg-sky-200',
  architecture: 'bg-cosmic-pink hover:bg-pink-200',
  testing: 'bg-teal-300 hover:bg-teal-200',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-mint hover:bg-mint-light text-green-700',
  superseded: 'bg-soft-yellow hover:bg-yellow-200 text-amber-700',
  deprecated: 'bg-gray-200 hover:bg-gray-300 text-gray-600',
};

export default function SearchFilterPanel({
  isOpen,
  onClose,
  domains,
  selectedDomains,
  onDomainToggle,
  statuses,
  selectedStatuses,
  onStatusToggle,
  searchQuery,
  onSearchChange
}: SearchFilterPanelProps) {
  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Search & Filter"
      icon={<Filter className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #c4b5e0, #9b7ed4)"
      width="400px"
      maxHeight="80vh"
    >
      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-game-text-light" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search decisions..."
          className="pl-10 h-11 bg-cream border-lavender-light focus:border-lavender rounded-xl"
        />
      </div>

      {/* Domain Filters */}
      <div className="mb-6">
        <h3 className="font-heading font-semibold text-sm text-game-text-dark mb-3">
          Domains
        </h3>
        <div className="flex flex-wrap gap-2">
          {domains.map((domain) => {
            const isSelected = selectedDomains.includes(domain);
            const domainKey = domain.toLowerCase().replace(/\s+/g, '');
            const colorClass = DOMAIN_COLORS[domainKey] || 'bg-lavender hover:bg-lavender-light';

            return (
              <button
                key={domain}
                onClick={() => onDomainToggle(domain)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
                  ${isSelected
                    ? `${colorClass} text-game-text-dark ring-2 ring-cosmic-purple ring-offset-1`
                    : 'bg-cream text-game-text-light hover:bg-lavender-light'
                  }
                `}
              >
                {domain}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Filters */}
      <div className="mb-6">
        <h3 className="font-heading font-semibold text-sm text-game-text-dark mb-3">
          Status
        </h3>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => {
            const isSelected = selectedStatuses.includes(status);
            const colorClass = STATUS_COLORS[status] || 'bg-gray-200 hover:bg-gray-300 text-gray-600';

            return (
              <button
                key={status}
                onClick={() => onStatusToggle(status)}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
                  ${isSelected
                    ? `${colorClass} ring-2 ring-cosmic-purple ring-offset-1`
                    : 'bg-cream text-game-text-light hover:bg-lavender-light'
                  }
                `}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear Filters */}
      {(selectedDomains.length > 0 || selectedStatuses.length > 0 || searchQuery) && (
        <button
          onClick={() => {
            selectedDomains.forEach(d => onDomainToggle(d));
            selectedStatuses.forEach(s => onStatusToggle(s));
            onSearchChange('');
          }}
          className="w-full py-2 text-sm text-cosmic-purple hover:text-cosmic-purple/80 transition-colors"
        >
          Clear all filters
        </button>
      )}
    </FloatingPanel>
  );
}
