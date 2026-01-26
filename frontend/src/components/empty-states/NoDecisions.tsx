'use client';

import { motion } from 'framer-motion';
import { Brain, Mic, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fadeInUpVariants } from '@/lib/animations';

interface NoDecisionsProps {
  onRecordClick?: () => void;
}

export function NoDecisions({ onRecordClick }: NoDecisionsProps) {
  return (
    <motion.div
      variants={fadeInUpVariants}
      initial="initial"
      animate="animate"
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center">
          <Brain className="w-12 h-12 text-primary-600" />
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="absolute -right-2 -bottom-2 w-10 h-10 rounded-full bg-success-100 flex items-center justify-center"
        >
          <Mic className="w-5 h-5 text-success-600" />
        </motion.div>
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Start capturing your reasoning
      </h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        Record your coding sessions to capture decisions, thought processes, and
        technical rationale. Your AI bot will learn from every session.
      </p>

      {/* CTA */}
      <Button onClick={onRecordClick} className="group">
        Record Your First Session
        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Button>
    </motion.div>
  );
}
