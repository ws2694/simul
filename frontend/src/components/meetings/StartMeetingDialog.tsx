'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Users, Sparkles } from 'lucide-react';
import { createMeeting } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TeamMember {
  user_id: number;
  full_name: string;
  role: string;
  bot_enabled: boolean;
}

interface StartMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: number;
  members: TeamMember[];
}

export function StartMeetingDialog({
  open,
  onOpenChange,
  teamId,
  members,
}: StartMeetingDialogProps) {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMember = (userId: number) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedMembers(newSelected);
  };

  const selectAll = () => {
    const enabledMembers = members
      .filter((m) => m.bot_enabled)
      .map((m) => m.user_id);
    setSelectedMembers(new Set(enabledMembers));
  };

  const handleCreate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    if (selectedMembers.size < 2) {
      setError('Please select at least 2 participants');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const meeting = await createMeeting({
        title: topic.trim(),
        topic: topic.trim(),
        description: description.trim() || undefined,
        team_id: teamId,
        participant_ids: Array.from(selectedMembers),
      });

      onOpenChange(false);
      router.push(`/meeting/${meeting.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create meeting');
    } finally {
      setIsCreating(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-600" />
            </div>
            Start Bot Meeting
          </DialogTitle>
          <DialogDescription>
            Create a meeting where team members' bots discuss a topic and share
            their captured knowledge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Topic Input */}
          <div className="space-y-2">
            <Label htmlFor="topic">Topic / Decision to Discuss</Label>
            <Input
              id="topic"
              placeholder="e.g., API authentication strategy"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-11"
            />
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Additional Context <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="description"
              placeholder="Any specific questions or focus areas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Participant Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Participants</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                className="text-xs h-7"
              >
                Select All
              </Button>
            </div>
            <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
              {members.map((member) => {
                const isSelected = selectedMembers.has(member.user_id);
                const isDisabled = !member.bot_enabled;

                return (
                  <button
                    key={member.user_id}
                    onClick={() => !isDisabled && toggleMember(member.user_id)}
                    disabled={isDisabled}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-lg transition-colors',
                      isSelected
                        ? 'bg-primary-50 border border-primary-200'
                        : 'hover:bg-muted/50',
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={cn(
                            'text-xs font-medium',
                            isSelected
                              ? 'bg-primary-200 text-primary-700'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {getInitials(member.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      {member.bot_enabled && (
                        <Sparkles className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-primary-500" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {member.role}
                      </p>
                    </div>
                    {isDisabled && (
                      <Badge variant="outline" className="text-xs">
                        Bot Disabled
                      </Badge>
                    )}
                    {isSelected && !isDisabled && (
                      <div className="h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {selectedMembers.size} participant{selectedMembers.size !== 1 ? 's' : ''}{' '}
              selected (minimum 2)
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-error-50 text-error-700 text-sm border border-error-200">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !topic.trim() || selectedMembers.size < 2}
          >
            {isCreating ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                Creating...
              </>
            ) : (
              <>
                <Bot className="mr-2 h-4 w-4" />
                Start Meeting
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
