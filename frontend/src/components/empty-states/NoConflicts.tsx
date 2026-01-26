'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { fadeInUpVariants } from '@/lib/animations';

export function NoConflicts() {
  return (
    <motion.div
      variants={fadeInUpVariants}
      initial="initial"
      animate="animate"
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      {/* Celebration Illustration */}
      <div className="relative mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-success-100 flex items-center justify-center"
        >
          <CheckCircle2 className="w-10 h-10 text-success-600" />
        </motion.div>
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.3 }}
          className="absolute -right-1 -top-1"
        >
          <Sparkles className="w-6 h-6 text-warning-500" />
        </motion.div>
        <motion.div
          initial={{ scale: 0, rotate: 30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.4 }}
          className="absolute -left-2 top-2"
        >
          <Sparkles className="w-4 h-4 text-primary-500" />
        </motion.div>
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Your team is aligned!
      </h3>
      <p className="text-muted-foreground max-w-sm">
        No conflicting decisions detected. Your team is working in harmony with
        consistent technical approaches.
      </p>
    </motion.div>
  );
}
