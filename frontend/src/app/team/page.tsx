'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Users, ArrowRight, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { listTeams } from '@/lib/api';
import { AppShell } from '@/components/layout';
import { CreateTeamDialog } from '@/components/teams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { staggerContainerVariants, staggerItemVariants, fadeInVariants } from '@/lib/animations';
import Link from 'next/link';

function TeamsListContent() {
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
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeInVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Teams</h1>
            <p className="text-sm text-muted-foreground">
              Collaborate and query team knowledge
            </p>
          </div>
        </div>
        <CreateTeamDialog
          onTeamCreated={loadTeams}
          trigger={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Team
            </Button>
          }
        />
      </motion.div>

      {/* Teams Grid */}
      {teams.length > 0 ? (
        <motion.div
          variants={staggerContainerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {teams.map((team, i) => (
            <motion.div key={team.id} variants={staggerItemVariants} custom={i}>
              <Link href={`/team/${team.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 group-hover:text-primary-600 transition-colors">
                      <Users className="h-5 w-5" />
                      {team.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {team.member_count} member{team.member_count !== 1 ? 's' : ''}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={fadeInVariants}>
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a team to collaborate with others and run bot meetings
              </p>
              <CreateTeamDialog
                onTeamCreated={loadTeams}
                trigger={
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Team
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function TeamsPage() {
  return (
    <AppShell>
      <TeamsListContent />
    </AppShell>
  );
}
