'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

interface CampaignViewTrackerProps {
  campaignId: string;
  itemCount: number;
}

export const CampaignViewTracker: React.FC<CampaignViewTrackerProps> = ({
  campaignId,
  itemCount,
}) => {
  useEffect(() => {
    analytics.trackCampaignView(campaignId, {
      productCount: itemCount,
    });
  }, [campaignId, itemCount]);

  return null;
};
