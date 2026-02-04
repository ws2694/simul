'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, ArrowRight, Plus, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store';
import { listTeams } from '@/lib/api';
import { CreateTeamDialog } from '@/components/teams';
import { PageTransition } from '@/components/game';

export default function TeamsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTeams = async () => {
    try {
      const data = await listTeams();
      setTeams(data);
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    loadTeams();
  }, [token, router]);

  if (!token) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#e8e0f0] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Users className="w-8 h-8 text-[#9b7ed4]" />
          </div>
          <p className="text-[#8a8498]">Loading teams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ fontFamily: 'Nunito, sans-serif' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-4 py-2 bg-[#faf8f5] rounded-lg text-[#5a5470] hover:bg-[#e8e0f0] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#c4b5e0] to-[#9b7ed4] flex items-center justify-center text-white font-bold">
              <Users className="w-5 h-5" />
            </div>
            <span className="font-bold text-[#5a5470]" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              Your Teams
            </span>
          </div>
        </div>

        <CreateTeamDialog
          onTeamCreated={loadTeams}
          trigger={
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#c4b5e0] to-[#9b7ed4] rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg transition-shadow">
              <Plus className="h-4 w-4" />
              Create Team
            </button>
          }
        />
      </header>

      {/* Main Content */}
      <main className="pt-16 h-full">
        <div className="relative w-full h-full flex items-center justify-center bg-white">
          {/* Background Image */}
          <Image
            src="/asset-environment-1770090935004.png"
            alt="Teams Room"
            fill
            className="object-contain"
            priority
          />

          {/* Home Preview - Navigate back */}
          <PageTransition
            previewImage="/game-assets/room-background.png"
            targetPath="/"
            position={{ top: '4%', right: '4%' }}
            size={140}
            label="Home"
          />

          {/* Knowledge Graph Preview - Navigate to knowledge graph */}
          <PageTransition
            previewImage="/game-assets/observatory-background.png"
            targetPath="/knowledge-graph"
            position={{ bottom: '4%', right: '4%' }}
            size={140}
            label="Knowledge Graph"
          />

          {/* Teams Grid Overlay */}
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <motion.div
              className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-4xl w-full max-h-[70vh] overflow-auto"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {teams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team, i) => (
                    <motion.button
                      key={team.id}
                      onClick={() => router.push(`/team/${team.id}`)}
                      className="flex items-center justify-between p-5 rounded-2xl bg-[#faf8f5] hover:bg-[#e8e0f0] transition-all group text-left border-2 border-transparent hover:border-[#c4b5e0]"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#c4b5e0] to-[#9b7ed4] flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-[#5a5470] group-hover:text-[#9b7ed4] transition-colors">
                            {team.name}
                          </p>
                          <p className="text-sm text-[#8a8498]">
                            {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[#8a8498] group-hover:text-[#9b7ed4] group-hover:translate-x-1 transition-all" />
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-[#faf8f5] flex items-center justify-center mx-auto mb-6">
                    <Users className="w-10 h-10 text-[#8a8498] opacity-50" />
                  </div>
                  <h3 className="text-xl font-bold text-[#5a5470] mb-2">No teams yet</h3>
                  <p className="text-[#8a8498] mb-6">
                    Create a team to collaborate with others and run bot meetings
                  </p>
                  <CreateTeamDialog
                    onTeamCreated={loadTeams}
                    trigger={
                      <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#c4b5e0] to-[#9b7ed4] rounded-xl text-white font-bold shadow-md hover:shadow-lg transition-shadow mx-auto">
                        <Plus className="h-5 w-5" />
                        Create Your First Team
                      </button>
                    }
                  />
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
