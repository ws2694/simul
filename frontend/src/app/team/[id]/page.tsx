'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Users, Bot, Search, AlertTriangle, BarChart3, X } from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store';
import { getTeamMembers, getTeamActivity, listMeetings, type Meeting } from '@/lib/api';
import { BotQuery } from '@/components/BotQuery';
import { ConflictDetector } from '@/components/ConflictDetector';
import { StartMeetingDialog } from '@/components/meetings';
import { PageTransition } from '@/components/game';
import {
  TeamHotspot,
  MeetingsPanel,
  StatsBar,
  AddMemberDialog,
} from '@/components/teams';

export default function TeamPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = Number(params?.id || 0);
  const { token } = useAuthStore();

  // ============ STATE ============
  const [members, setMembers] = useState<any[]>([]);
  const [activity, setActivity] = useState<any>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Panel states
  const [showMeetingsPanel, setShowMeetingsPanel] = useState(false);
  const [showQueryPanel, setShowQueryPanel] = useState(false);
  const [showConflictsPanel, setShowConflictsPanel] = useState(false);
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);

  // ============ DATA LOADING ============
  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const loadTeamData = async () => {
      try {
        const [membersData, activityData, meetingsData] = await Promise.all([
          getTeamMembers(teamId),
          getTeamActivity(teamId, 7),
          listMeetings(teamId),
        ]);
        setMembers(membersData);
        setActivity(activityData);
        setMeetings(meetingsData);
      } catch (err) {
        console.error('Failed to load team data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamData();
  }, [token, teamId, router]);

  const reloadMembers = async () => {
    try {
      const membersData = await getTeamMembers(teamId);
      setMembers(membersData);
    } catch (err) {
      console.error('Failed to reload members:', err);
    }
  };

  const reloadMeetings = async () => {
    try {
      const meetingsData = await listMeetings(teamId);
      setMeetings(meetingsData);
    } catch (err) {
      console.error('Failed to reload meetings:', err);
    }
  };

  if (!token) return null;

  // ============ LOADING STATE ============
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#e8e0f0] flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Users className="w-8 h-8 text-[#9b7ed4]" />
          </div>
          <p className="text-[#8a8498]">Loading team...</p>
        </div>
      </div>
    );
  }

  // ============ GAME-LIKE UI ============
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
              T
            </div>
            <span className="font-bold text-[#5a5470]" style={{ fontFamily: 'Quicksand, sans-serif' }}>
              Team Dashboard
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Team Badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[#e8e0f0] rounded-full text-sm font-semibold text-[#9b8ac4]">
            <Users className="w-4 h-4" />
            {members.length} Members
          </div>

          {/* Add Member Button */}
          <button
            onClick={() => setShowAddMemberDialog(true)}
            className="px-4 py-2 bg-[#faf8f5] rounded-lg text-[#5a5470] font-semibold text-sm hover:bg-[#e8e0f0] transition-colors"
          >
            + Add Member
          </button>

          {/* Start Meeting Button */}
          <button
            onClick={() => setShowMeetingDialog(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#c4b5e0] to-[#9b7ed4] rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg transition-shadow"
          >
            <Bot className="w-4 h-4" />
            Start Bot Meeting
          </button>
        </div>
      </header>

      {/* Main Scene */}
      <main className="pt-16 h-full">
        <div className="relative w-full h-full flex items-center justify-center bg-white">
          {/* Background Image */}
          <Image
            src="/asset-environment-1770090935004.png"
            alt="Team Room"
            fill
            className="object-contain"
            priority
          />

          {/* Home Preview - Navigate back (top-right) */}
          <PageTransition
            previewImage="/game-assets/room-background.png"
            targetPath="/"
            position={{ top: '4%', right: '4%' }}
            size={140}
            label="Home"
          />

          {/* Knowledge Graph Preview (bottom-right) */}
          <PageTransition
            previewImage="/game-assets/observatory-background.png"
            targetPath="/knowledge-graph"
            position={{ bottom: '4%', right: '4%' }}
            size={140}
            label="Knowledge Graph"
          />

          {/* Hotspots - positioned around the 4 chairs */}
          <TeamHotspot
            icon={<Bot className="w-5 h-5 text-[#9b7ed4]" />}
            title="Bot Meetings"
            description="View and start meetings"
            badge={meetings.length}
            position={{ top: '33%', left: '33%', width: '5%', height: '8%' }}
            onClick={() => setShowMeetingsPanel(true)}
          />

          <TeamHotspot
            icon={<Search className="w-5 h-5 text-[#4a8a5a]" />}
            title="Team Query"
            description="Search team knowledge"
            position={{ top: '33%', right: '33%', width: '5%', height: '8%' }}
            onClick={() => setShowQueryPanel(true)}
          />

          <TeamHotspot
            icon={<AlertTriangle className="w-5 h-5 text-[#c49b3a]" />}
            title="Conflicts"
            description="Detect decision conflicts"
            position={{ top: '52%', left: '27%', width: '5%', height: '8%' }}
            onClick={() => setShowConflictsPanel(true)}
          />

          <TeamHotspot
            icon={<BarChart3 className="w-5 h-5 text-[#9b7ed4]" />}
            title="Activity"
            description="Team activity log"
            position={{ top: '52%', right: '27%', width: '5%', height: '8%' }}
            onClick={() => setShowActivityPanel(true)}
          />

          {/* Stats Bar */}
          <StatsBar
            meetingsCount={meetings.length}
            decisionsCount={activity?.total_decisions ?? 0}
            consensusRate={meetings.filter(m => m.status === 'completed').length > 0 ? 87 : undefined}
          />
        </div>
      </main>

      {/* Meetings Panel */}
      <MeetingsPanel
        isOpen={showMeetingsPanel}
        onClose={() => setShowMeetingsPanel(false)}
        meetings={meetings}
        onNewMeeting={() => setShowMeetingDialog(true)}
      />

      {/* Query Panel */}
      <AnimatePresence>
        {showQueryPanel && (
          <>
            <motion.div
              className="fixed inset-0 bg-[#5a5470]/15 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQueryPanel(false)}
            />
            <motion.div
              className="fixed top-1/2 left-1/2 w-[600px] max-w-[95vw] max-h-[85vh] bg-white rounded-3xl shadow-2xl z-[60] overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#d4ede0] flex items-center justify-center">
                    <Search className="w-5 h-5 text-[#4a8a5a]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#5a5470] text-lg">Team Query</h2>
                    <p className="text-xs text-[#8a8498]">Search team knowledge</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQueryPanel(false)}
                  className="w-9 h-9 rounded-lg bg-[#faf8f5] flex items-center justify-center text-[#8a8498] hover:bg-[#e8e0f0] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <BotQuery mode="team" targetId={teamId} targetName="Team" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Conflicts Panel */}
      <AnimatePresence>
        {showConflictsPanel && (
          <>
            <motion.div
              className="fixed inset-0 bg-[#5a5470]/15 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConflictsPanel(false)}
            />
            <motion.div
              className="fixed top-1/2 left-1/2 w-[600px] max-w-[95vw] max-h-[85vh] bg-white rounded-3xl shadow-2xl z-[60] overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#f5e6b8] flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-[#c49b3a]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#5a5470] text-lg">Conflicts</h2>
                    <p className="text-xs text-[#8a8498]">Detect decision conflicts</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConflictsPanel(false)}
                  className="w-9 h-9 rounded-lg bg-[#faf8f5] flex items-center justify-center text-[#8a8498] hover:bg-[#e8e0f0] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <ConflictDetector teamId={teamId} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Activity Panel */}
      <AnimatePresence>
        {showActivityPanel && activity && (
          <>
            <motion.div
              className="fixed inset-0 bg-[#5a5470]/15 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowActivityPanel(false)}
            />
            <motion.div
              className="fixed top-1/2 left-1/2 w-[550px] max-w-[95vw] max-h-[85vh] bg-white rounded-3xl shadow-2xl z-[60] overflow-hidden"
              initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#e8e0f0] flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-[#9b7ed4]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-[#5a5470] text-lg">Team Activity</h2>
                    <p className="text-xs text-[#8a8498]">Last 7 days</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowActivityPanel(false)}
                  className="w-9 h-9 rounded-lg bg-[#faf8f5] flex items-center justify-center text-[#8a8498] hover:bg-[#e8e0f0] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#e8e0f0] to-[#d8cce8]">
                    <div className="text-3xl font-extrabold text-[#9b7ed4]">
                      {activity.total_decisions}
                    </div>
                    <div className="text-sm text-[#9b8ac4]">Decisions Captured</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#d4ede0] to-[#c4ddd0]">
                    <div className="text-3xl font-extrabold text-[#4a8a5a]">
                      {Object.keys(activity.by_user).length}
                    </div>
                    <div className="text-sm text-[#5a9a6a]">Active Contributors</div>
                  </div>
                </div>

                {/* By User */}
                <div>
                  <h3 className="font-bold text-[#5a5470] mb-3">By Team Member</h3>
                  <div className="space-y-3">
                    {Object.entries(activity.by_user).map(([name, decisions]: [string, any]) => (
                      <div key={name} className="p-4 rounded-xl bg-[#faf8f5]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-[#5a5470]">{name}</span>
                          <span className="px-2 py-1 bg-[#e8e0f0] text-[#9b8ac4] rounded-full text-xs font-bold">
                            {decisions.length} decisions
                          </span>
                        </div>
                        <div className="space-y-1">
                          {decisions.slice(0, 2).map((d: any) => (
                            <div key={d.id} className="text-sm text-[#8a8498] truncate">
                              • {d.title}
                            </div>
                          ))}
                          {decisions.length > 2 && (
                            <div className="text-xs text-[#8a8498]">
                              +{decisions.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Domain */}
                <div>
                  <h3 className="font-bold text-[#5a5470] mb-3">By Domain</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(activity.by_domain).map(([domain, count]: [string, any]) => (
                      <span
                        key={domain}
                        className="px-3 py-1.5 bg-[#faf8f5] rounded-full text-sm text-[#5a5470] font-medium"
                      >
                        {domain}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Start Meeting Dialog */}
      <StartMeetingDialog
        open={showMeetingDialog}
        onOpenChange={(open) => {
          setShowMeetingDialog(open);
          if (!open) reloadMeetings();
        }}
        teamId={teamId}
        members={members}
      />

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={showAddMemberDialog}
        onOpenChange={setShowAddMemberDialog}
        teamId={teamId}
        existingMemberIds={members.map((m) => m.user_id)}
        onMemberAdded={reloadMembers}
      />
    </div>
  );
}
