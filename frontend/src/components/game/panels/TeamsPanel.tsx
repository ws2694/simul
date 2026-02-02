'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowRight, Plus } from 'lucide-react';
import FloatingPanel from '../FloatingPanel';
import { CreateTeamDialog } from '@/components/teams';
import { listTeams } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface TeamsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamsPanel({ isOpen, onClose }: TeamsPanelProps) {
  const router = useRouter();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await listTeams();
      setTeams(data);
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadTeams();
    }
  }, [isOpen, loadTeams]);

  const handleTeamClick = (teamId: number) => {
    onClose();
    router.push(`/team/${teamId}`);
  };

  const handleTeamCreated = () => {
    loadTeams();
  };

  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Your Teams"
      icon={<Users className="w-5 h-5 text-white" />}
      iconBg="linear-gradient(135deg, #b8d4e8, #87ceeb)"
      width="420px"
      maxHeight="80vh"
    >
      {/* Create Team Button */}
      <div className="mb-5">
        <CreateTeamDialog
          onTeamCreated={handleTeamCreated}
          trigger={
            <Button
              className="w-full h-11 gap-2 bg-gradient-to-r from-lavender to-cosmic-purple hover:from-lavender-dark hover:to-cosmic-purple text-white border-0 shadow-game-card hover:shadow-game-hover transition-all"
            >
              <Plus className="h-4 w-4" />
              Create New Team
            </Button>
          }
        />
      </div>

      {/* Teams List */}
      <div className="space-y-2">
        {teams.length > 0 ? (
          teams.map((team) => (
            <button
              key={team.id}
              onClick={() => handleTeamClick(team.id)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-cream/50 hover:bg-cream transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-soft-blue to-lavender flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm text-game-text-dark group-hover:text-cosmic-purple transition-colors">
                    {team.name}
                  </p>
                  <p className="text-xs text-game-text-light">
                    {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-game-text-light group-hover:text-cosmic-purple group-hover:translate-x-1 transition-all" />
            </button>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-lavender-light flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-lavender-dark opacity-50" />
            </div>
            <p className="text-game-text-light mb-1">No teams yet</p>
            <p className="text-sm text-game-text-light/70">
              Create a team to collaborate with others
            </p>
          </div>
        )}
      </div>
    </FloatingPanel>
  );
}
