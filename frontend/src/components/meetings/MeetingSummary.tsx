'use client';

import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  ListTodo,
  HelpCircle,
  Handshake,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  staggerContainerVariants,
  staggerItemVariants,
  fadeInVariants,
} from '@/lib/animations';

interface ActionItem {
  action: string;
  owner?: string;
}

interface MeetingSummaryProps {
  summary: string | null;
  consensusReached: boolean | null;
  actionItems: ActionItem[] | null;
}

export function MeetingSummary({
  summary,
  consensusReached,
  actionItems,
}: MeetingSummaryProps) {
  if (!summary) {
    return null;
  }

  // Parse markdown-style summary
  const sections = parseSummary(summary);

  return (
    <motion.div
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      {/* Consensus Status */}
      <motion.div variants={fadeInVariants}>
        <Card
          className={cn(
            'border-2',
            consensusReached
              ? 'border-success-200 bg-success-50/30'
              : 'border-warning-200 bg-warning-50/30'
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {consensusReached ? (
                <CheckCircle2 className="h-8 w-8 text-success-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-warning-500" />
              )}
              <div>
                <p className="font-semibold text-lg">
                  {consensusReached
                    ? 'Consensus Reached'
                    : 'Consensus Not Reached'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {consensusReached
                    ? 'The team bots have aligned on the key points'
                    : 'There are still open questions to address'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Points */}
      {sections.keyPoints && sections.keyPoints.length > 0 && (
        <motion.div variants={staggerItemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary-100 flex items-center justify-center">
                  <ListTodo className="h-4 w-4 text-primary-600" />
                </div>
                Key Discussion Points
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {sections.keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {i + 1}
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Agreements */}
      {sections.agreements && sections.agreements.length > 0 && (
        <motion.div variants={staggerItemVariants}>
          <Card className="border-success-200/50 bg-success-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-success-100 flex items-center justify-center">
                  <Handshake className="h-4 w-4 text-success-600" />
                </div>
                Areas of Agreement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {sections.agreements.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Disagreements */}
      {sections.disagreements && sections.disagreements.length > 0 && (
        <motion.div variants={staggerItemVariants}>
          <Card className="border-warning-200/50 bg-warning-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-warning-100 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-warning-600" />
                </div>
                Areas of Disagreement
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {sections.disagreements.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-warning-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Items */}
      {actionItems && actionItems.length > 0 && (
        <motion.div variants={staggerItemVariants}>
          <Card className="border-primary-200/50 bg-primary-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary-100 flex items-center justify-center">
                  <ListTodo className="h-4 w-4 text-primary-600" />
                </div>
                Action Items
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-3">
                {actionItems.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start justify-between gap-4 p-3 rounded-lg bg-background/50"
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-muted-foreground/30"
                      />
                      <span className="text-sm">{item.action}</span>
                    </div>
                    {item.owner && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {item.owner}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Open Questions */}
      {sections.openQuestions && sections.openQuestions.length > 0 && (
        <motion.div variants={staggerItemVariants}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                Open Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2">
                {sections.openQuestions.map((question, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <HelpCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

interface ParsedSummary {
  keyPoints: string[];
  agreements: string[];
  disagreements: string[];
  openQuestions: string[];
}

function parseSummary(summary: string): ParsedSummary {
  const result: ParsedSummary = {
    keyPoints: [],
    agreements: [],
    disagreements: [],
    openQuestions: [],
  };

  const lines = summary.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for section headers
    if (trimmed.includes('Key Discussion Points') || trimmed.includes('Key Points')) {
      currentSection = 'keyPoints';
      continue;
    }
    if (trimmed.includes('Areas of Agreement') || trimmed.includes('Agreement')) {
      currentSection = 'agreements';
      continue;
    }
    if (trimmed.includes('Areas of Disagreement') || trimmed.includes('Disagreement')) {
      currentSection = 'disagreements';
      continue;
    }
    if (trimmed.includes('Open Questions')) {
      currentSection = 'openQuestions';
      continue;
    }
    if (trimmed.includes('Action Items')) {
      currentSection = ''; // Skip action items here, they come from the prop
      continue;
    }

    // Parse bullet points
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.match(/^\d+\./)) {
      const content = trimmed
        .replace(/^[-*]\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .trim();

      if (content && currentSection) {
        result[currentSection as keyof ParsedSummary].push(content);
      }
    }
  }

  return result;
}
