'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Users,
  Search,
  AlertTriangle,
  Activity,
  Circle,
  Bot,
  MessageSquare,
  CheckCircle2,
  Clock,
  Plus,
  UserPlus,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { getTeamMembers, getTeamActivity, listMeetings, type Meeting } from '@/lib/api';
import { AppShell } from '@/components/layout';
import { BotQuery } from '@/components/BotQuery';
import { ConflictDetector } from '@/components/ConflictDetector';
import { StartMeetingDialog } from '@/components/meetings';
import { AddMemberDialog } from '@/components/teams';
import { formatRelativeTime, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { staggerContainerVariants, staggerItemVariants, fadeInVariants } from '@/lib/animations';
import Link from 'next/link';

function TeamPageContent() {
  const router = useRouter();
  const params = useParams();
  const teamId = Number(params?.id || 0);
  const { token } = useAuthStore();

  const [members, setMembers] = useState<any[]>([]);
  const [activity, setActivity] = useState<any>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'query' | 'conflicts' | 'activity' | 'meetings'>('query');
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);

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

  if (!token) return null;

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeInVariants} className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Team Dashboard</h1>
            <p className="text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-4 w-24 mt-1" />
              ) : (
                `${members.length} members`
              )}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowMeetingDialog(true)} className="gap-2">
          <Bot className="h-4 w-4" />
          Start Bot Meeting
        </Button>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Team Members */}
        <motion.div variants={fadeInVariants} className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={() => setShowAddMemberDialog(true)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <motion.div
                  variants={staggerContainerVariants}
                  className="space-y-2"
                >
                  {members.map((member, i) => {
                    const initials = member.full_name
                      ?.split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || 'U';

                    return (
                      <motion.div
                        key={member.user_id}
                        variants={staggerItemVariants}
                        custom={i}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer"
                      >
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary-100 text-primary-700 font-medium text-sm">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <Circle
                            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${
                              member.bot_enabled
                                ? 'text-success-500 fill-success-500'
                                : 'text-muted fill-muted'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate group-hover:text-primary-600 transition-colors">
                            {member.full_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs capitalize">
                              {member.role}
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div variants={fadeInVariants} className="lg:col-span-3 space-y-6">
          {/* Tabs with proper TabsContent */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="query" className="gap-2">
                <Search className="h-4 w-4" />
                Team Query
              </TabsTrigger>
              <TabsTrigger value="meetings" className="gap-2">
                <Bot className="h-4 w-4" />
                Meetings
                {meetings.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {meetings.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="conflicts" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Conflicts
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="query" className="mt-6">
              <BotQuery mode="team" targetId={teamId} targetName="Team" />
            </TabsContent>

            <TabsContent value="meetings" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Bot Meetings
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => setShowMeetingDialog(true)}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    New Meeting
                  </Button>
                </CardHeader>
                <CardContent>
                  {meetings.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Bot className="w-8 h-8 text-muted-foreground opacity-50" />
                      </div>
                      <p className="text-muted-foreground mb-2">
                        No bot meetings yet
                      </p>
                      <p className="text-sm text-muted-foreground/70 mb-4">
                        Start a meeting to have bots discuss decisions and reach consensus
                      </p>
                      <Button onClick={() => setShowMeetingDialog(true)} className="gap-2">
                        <Bot className="h-4 w-4" />
                        Start First Meeting
                      </Button>
                    </div>
                  ) : (
                    <motion.div
                      variants={staggerContainerVariants}
                      initial="initial"
                      animate="animate"
                      className="space-y-3"
                    >
                      {meetings.map((meeting, i) => {
                        const statusConfig = {
                          scheduled: { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
                          in_progress: { icon: MessageSquare, color: 'text-primary-600', bg: 'bg-primary-100' },
                          completed: { icon: CheckCircle2, color: 'text-success-600', bg: 'bg-success-100' },
                          cancelled: { icon: AlertTriangle, color: 'text-error-600', bg: 'bg-error-100' },
                        };
                        const config = statusConfig[meeting.status];
                        const StatusIcon = config.icon;

                        return (
                          <motion.div
                            key={meeting.id}
                            variants={staggerItemVariants}
                            custom={i}
                          >
                            <Link href={`/meeting/${meeting.id}`}>
                              <div className="flex items-center gap-4 p-4 rounded-xl border hover:border-primary-200 hover:bg-muted/30 transition-all cursor-pointer">
                                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', config.bg)}>
                                  <StatusIcon className={cn('h-5 w-5', config.color)} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{meeting.title}</p>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>{meeting.participant_count} participants</span>
                                    <span>·</span>
                                    <span>{meeting.message_count} messages</span>
                                    <span>·</span>
                                    <span>{formatRelativeTime(meeting.created_at)}</span>
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'capitalize',
                                    meeting.status === 'completed' && 'bg-success-50 text-success-700 border-success-200',
                                    meeting.status === 'in_progress' && 'bg-primary-50 text-primary-700 border-primary-200'
                                  )}
                                >
                                  {meeting.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conflicts" className="mt-6">
              <ConflictDetector teamId={teamId} />
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              {activity && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-purple-600" />
                  </div>
                  Team Activity (Last 7 Days)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    variants={staggerItemVariants}
                    className="p-4 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100/50 border border-primary-200/50"
                  >
                    <div className="text-3xl font-bold text-primary-700">
                      {activity.total_decisions}
                    </div>
                    <div className="text-sm text-primary-600/80">
                      Decisions Captured
                    </div>
                  </motion.div>
                  <motion.div
                    variants={staggerItemVariants}
                    className="p-4 rounded-xl bg-gradient-to-br from-success-50 to-success-100/50 border border-success-200/50"
                  >
                    <div className="text-3xl font-bold text-success-700">
                      {Object.keys(activity.by_user).length}
                    </div>
                    <div className="text-sm text-success-600/80">
                      Active Contributors
                    </div>
                  </motion.div>
                </div>

                {/* By User */}
                <div>
                  <h3 className="font-medium mb-3">By Team Member</h3>
                  <motion.div
                    variants={staggerContainerVariants}
                    className="space-y-3"
                  >
                    {Object.entries(activity.by_user).map(
                      ([name, decisions]: [string, any], i) => (
                        <motion.div
                          key={name}
                          variants={staggerItemVariants}
                          custom={i}
                          className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium">{name}</span>
                            <Badge variant="secondary">
                              {decisions.length} decisions
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {decisions.slice(0, 3).map((d: any) => (
                              <div
                                key={d.id}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                              >
                                <Badge variant="outline" className="text-xs">
                                  {d.domain}
                                </Badge>
                                <span className="truncate">{d.title}</span>
                              </div>
                            ))}
                            {decisions.length > 3 && (
                              <p className="text-xs text-muted-foreground pl-1">
                                +{decisions.length - 3} more
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )
                    )}
                  </motion.div>
                </div>

                {/* By Domain */}
                <div>
                  <h3 className="font-medium mb-3">By Domain</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(activity.by_domain).map(
                      ([domain, count]: [string, any]) => (
                        <Badge
                          key={domain}
                          variant="secondary"
                          className="px-3 py-1 text-sm"
                        >
                          {domain}: {count}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Start Meeting Dialog */}
      <StartMeetingDialog
        open={showMeetingDialog}
        onOpenChange={setShowMeetingDialog}
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
    </motion.div>
  );
}

export default function TeamPage() {
  return (
    <AppShell>
      <TeamPageContent />
    </AppShell>
  );
}
