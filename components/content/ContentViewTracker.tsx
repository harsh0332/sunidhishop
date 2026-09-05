'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

interface ContentViewTrackerProps {
  contentId: string;
  campaignId?: string;
  itemCount: number;
}

export const ContentViewTracker: React.FC<ContentViewTrackerProps> = ({
  contentId,
  campaignId,
  itemCount,
}) => {
  useEffect(() => {
    analytics.trackContentView(contentId, {
      campaignId,
      productCount: itemCount,
    });
  }, [contentId, campaignId, itemCount]);

  return null;
};
