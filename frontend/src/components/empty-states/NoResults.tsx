'use client';

import { motion } from 'framer-motion';
import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fadeInUpVariants } from '@/lib/animations';

interface NoResultsProps {
  query?: string;
  onReset?: () => void;
}

export function NoResults({ query, onReset }: NoResultsProps) {
  return (
    <motion.div
      variants={fadeInUpVariants}
      initial="initial"
      animate="animate"
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      {/* Illustration */}
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Search className="w-10 h-10 text-muted-foreground opacity-50" />
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No matching decisions found
      </h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        {query ? (
          <>
            We couldn't find any decisions matching "<span className="font-medium">{query}</span>".
            Try adjusting your search terms.
          </>
        ) : (
          'Try searching with different keywords or record more sessions to expand your knowledge base.'
        )}
      </p>

      {/* CTA */}
      {onReset && (
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Clear Search
        </Button>
      )}
    </motion.div>
  );
}
