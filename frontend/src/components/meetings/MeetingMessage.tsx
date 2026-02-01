'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { MeetingMessage as MeetingMessageType } from '@/lib/api';

interface MeetingMessageProps {
  message: MeetingMessageType;
  isLatest?: boolean;
}

export function MeetingMessage({ message, isLatest }: MeetingMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isFacilitator = message.role === 'facilitator';
  const isSystem = message.role === 'system';
  const hasCitations = message.cited_decisions && message.cited_decisions.length > 0;

  const getInitials = (name: string) => {
    // For bot names like "Alice's Bot", extract the person's initials
    const personName = name.replace("'s Bot", '').replace(' Bot', '');
    return personName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getBgColor = () => {
    if (isFacilitator) return 'bg-gradient-to-br from-primary-50 to-primary-100/50 border-primary-200/50';
    if (isSystem) return 'bg-muted/30 border-muted';
    return 'bg-gradient-to-br from-muted/50 to-muted/30 border-border/50';
  };

  const getAvatarColor = () => {
    if (isFacilitator) return 'bg-primary-200 text-primary-700';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-3 p-4',
        isLatest && 'bg-muted/20 rounded-xl'
      )}
    >
      {/* Avatar */}
      <div className="shrink-0">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={cn('text-sm font-medium', getAvatarColor())}>
              {isFacilitator ? (
                <Sparkles className="h-4 w-4" />
              ) : (
                getInitials(message.speaker_name)
              )}
            </AvatarFallback>
          </Avatar>
          {!isFacilitator && !isSystem && (
            <Bot className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-primary-500 bg-background rounded-full p-0.5" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{message.speaker_name}</span>
          {isFacilitator && (
            <Badge variant="outline" className="text-xs bg-primary-50 text-primary-700 border-primary-200">
              Facilitator
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(message.created_at)}
          </span>
        </div>

        {/* Message Content */}
        <div
          className={cn(
            'p-4 rounded-xl border',
            getBgColor()
          )}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </p>
        </div>

        {/* Citations */}
        {hasCitations && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-3 w-3 mr-1" />
              {message.cited_decisions!.length} decision{message.cited_decisions!.length > 1 ? 's' : ''} cited
              {isExpanded ? (
                <ChevronUp className="h-3 w-3 ml-1" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-1" />
              )}
            </Button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.cited_decisions!.map((decisionId) => (
                      <Badge
                        key={decisionId}
                        variant="outline"
                        className="text-xs"
                      >
                        Decision #{decisionId}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
