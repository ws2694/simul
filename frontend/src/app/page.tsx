'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Brain,
  Mic,
  Search,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { getBotStats, getRecentReasoning, listTeams } from '@/lib/api';
import { AppShell } from '@/components/layout';
import { AudioRecorder } from '@/components/AudioRecorder';
import { BotQuery } from '@/components/BotQuery';
import { formatConfidence, formatRelativeTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DashboardSkeleton } from '@/components/skeletons';
import { NoDecisions } from '@/components/empty-states';
import { staggerContainerVariants, staggerItemVariants, fadeInVariants } from '@/lib/animations';
import { useSessionProcessing } from '@/hooks/useSessionProcessing';
import Link from 'next/link';

// Animated counter component
function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);
  const countRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const stepValue = value / steps;
    let current = 0;

    countRef.current = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setDisplayValue(value);
        if (countRef.current) clearInterval(countRef.current);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => {
      if (countRef.current) clearInterval(countRef.current);
    };
  }, [value]);

  return (
    <span className="tabular-nums">
      {displayValue}
      {suffix}
    </span>
  );
}

// Stat card component
function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  accentColor,
  value,
  suffix = '',
  label,
  trend,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  accentColor?: string;
  value: number;
  suffix?: string;
  label: string;
  trend?: { value: number; positive: boolean };
  delay?: number;
}) {
  return (
    <motion.div
      variants={staggerItemVariants}
      custom={delay}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      <Card className={`overflow-hidden card-hover ${accentColor || 'border-t-2 border-t-primary-400'}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${iconBg}`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  <AnimatedCounter value={value} suffix={suffix} />
                </span>
                {trend && (
                  <span
                    className={`text-sm font-medium ${
                      trend.positive ? 'text-success-600' : 'text-error-600'
                    }`}
                  >
                    {trend.positive ? '+' : '-'}
                    {trend.value}%
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Decision card component
function DecisionCard({
  decision,
  index,
}: {
  decision: any;
  index: number;
}) {
  return (
    <motion.div
      variants={staggerItemVariants}
      custom={index}
      whileHover={{ x: 4 }}
      className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate group-hover:text-primary-600 transition-colors">
            {decision.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="secondary" className="text-xs">
              {decision.domain}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(decision.date)}
            </span>
          </div>
        </div>
        <Badge
          className={`shrink-0 ${
            decision.confidence >= 0.7
              ? 'bg-success-100 text-success-700'
              : decision.confidence >= 0.4
              ? 'bg-warning-100 text-warning-700'
              : 'bg-error-100 text-error-700'
          }`}
        >
          {formatConfidence(decision.confidence)}
        </Badge>
      </div>
    </motion.div>
  );
}

// Processing Status Card
function ProcessingStatusCard({
  status,
  session,
  onViewDecisions,
}: {
  status: string;
  session: any;
  onViewDecisions?: () => void;
}) {
  if (status === 'idle') return null;

  if (status === 'completed' && session) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-900">Session Processed!</p>
                <p className="text-sm text-green-700">
                  {session.title} - {session.summary ? 'Decisions extracted' : 'Processing complete'}
                </p>
              </div>
              {onViewDecisions && (
                <Button variant="outline" size="sm" onClick={onViewDecisions}>
                  View
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === 'failed') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-900">Processing Failed</p>
                <p className="text-sm text-red-700">
                  There was an error processing your session.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // pending or processing
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">Processing Session...</p>
              <p className="text-sm text-muted-foreground">
                AI is extracting decisions from your recording
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [recentDecisions, setRecentDecisions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<string>(
    searchParams?.get('tab') || 'query'
  );

  // Session processing hook
  const { status: processingStatus, session: processedSession, isProcessing, startTracking, reset } = useSessionProcessing();

  // Load recent decisions
  const loadRecentDecisions = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const recentData = await getRecentReasoning(7);
      setRecentDecisions(recentData.decisions || []);
    } catch (err) {
      console.error('Failed to refresh decisions:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Refresh when processing completes
  useEffect(() => {
    if (processingStatus === 'completed') {
      loadRecentDecisions();
    }
  }, [processingStatus, loadRecentDecisions]);

  // Handle session created callback
  const handleSessionCreated = useCallback((session: any) => {
    console.log('Session created:', session);
    startTracking(session.id);
  }, [startTracking]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      setIsAuthenticated(false);
      router.push('/login');
      return;
    }

    setIsAuthenticated(true);

    const loadData = async () => {
      try {
        const [statsData, recentData, teamsData] = await Promise.all([
          getBotStats(),
          getRecentReasoning(7),
          listTeams(),
        ]);
        setStats(statsData);
        setRecentDecisions(recentData.decisions || []);
        setTeams(teamsData);
      } catch (err) {
        console.error('Dashboard: Failed to load data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  if (isAuthenticated === null) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-8"
    >
      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Brain}
            iconBg="from-primary-100 to-primary-50"
            iconColor="text-primary-600"
            accentColor="border-t-2 border-t-primary-400"
            value={stats.total_decisions}
            label="Total Decisions"
            delay={0}
          />
          <StatCard
            icon={TrendingUp}
            iconBg="from-success-100 to-success-50"
            iconColor="text-success-600"
            accentColor="border-t-2 border-t-success-400"
            value={stats.decisions_this_week}
            label="This Week"
            trend={stats.decisions_this_week > 0 ? { value: 12, positive: true } : undefined}
            delay={1}
          />
          <StatCard
            icon={Brain}
            iconBg="from-warning-100 to-warning-50"
            iconColor="text-warning-600"
            accentColor="border-t-2 border-t-warning-400"
            value={Math.round(stats.avg_confidence * 100)}
            suffix="%"
            label="Avg Confidence"
            delay={2}
          />
          <StatCard
            icon={Users}
            iconBg="from-purple-100 to-purple-50"
            iconColor="text-purple-600"
            accentColor="border-t-2 border-t-purple-400"
            value={teams.length}
            label="Teams"
            delay={3}
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <motion.div variants={fadeInVariants} className="lg:col-span-2 space-y-6">
          {/* Processing Status */}
          <ProcessingStatusCard
            status={processingStatus}
            session={processedSession}
            onViewDecisions={() => {
              reset();
              loadRecentDecisions();
            }}
          />

          {/* Tabs with proper TabsContent */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="query" className="gap-2">
                <Search className="h-4 w-4" />
                Query Bot
              </TabsTrigger>
              <TabsTrigger value="record" className="gap-2">
                <Mic className="h-4 w-4" />
                Record Session
              </TabsTrigger>
            </TabsList>

            <TabsContent value="query" className="mt-6">
              <BotQuery mode="personal" />
            </TabsContent>

            <TabsContent value="record" className="mt-6">
              <AudioRecorder onSessionCreated={handleSessionCreated} />
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Sidebar Column */}
        <motion.div variants={staggerContainerVariants} className="space-y-6">
          {/* Recent Decisions */}
          <motion.div variants={fadeInVariants}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  Recent Decisions
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadRecentDecisions}
                    disabled={isRefreshing}
                    className="h-8 w-8 p-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {recentDecisions.length > 0 ? (
                  <motion.div
                    variants={staggerContainerVariants}
                    className="space-y-2"
                  >
                    {recentDecisions.slice(0, 5).map((decision, i) => (
                      <DecisionCard key={decision.id} decision={decision} index={i} />
                    ))}
                  </motion.div>
                ) : (
                  <NoDecisions onRecordClick={() => setActiveTab('record')} />
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Low Confidence Decisions */}
          {stats?.low_confidence_decisions?.length > 0 && (
            <motion.div variants={fadeInVariants}>
              <Card className="border-warning-200 bg-warning-50/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning-600" />
                    Needs Review
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {stats.low_confidence_decisions.map((decision: any, i: number) => (
                    <motion.div
                      key={decision.id}
                      variants={staggerItemVariants}
                      custom={i}
                      className="p-3 rounded-lg bg-warning-100/50 hover:bg-warning-100 transition-colors cursor-pointer"
                    >
                      <p className="text-sm font-medium truncate">
                        {decision.title}
                      </p>
                      <p className="text-xs text-warning-700 mt-1">
                        Confidence: {formatConfidence(decision.confidence)}
                      </p>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Teams */}
          {teams.length > 0 && (
            <motion.div variants={fadeInVariants}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Your Teams
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {teams.map((team, i) => (
                    <motion.div
                      key={team.id}
                      variants={staggerItemVariants}
                      custom={i}
                    >
                      <Link
                        href={`/team/${team.id}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                      >
                        <div>
                          <p className="font-medium text-sm group-hover:text-primary-600 transition-colors">
                            {team.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {team.member_count} members
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                      </Link>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  return (
    <AppShell>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </AppShell>
  );
}
