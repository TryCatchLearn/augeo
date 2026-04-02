"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { CountdownUrgencyTier } from "@/features/listings/utils";
import {
  formatTimeRemaining,
  getCountdownUrgencyTier,
} from "@/features/listings/utils";

export type ListingCountdownSnapshot = {
  formatted: string;
  urgency: CountdownUrgencyTier;
  isEnded: boolean;
};

type ListingCountdownProps = {
  targetAt: Date;
  onEnd?: () => void;
  children: (snapshot: ListingCountdownSnapshot) => React.ReactNode;
};

export function ListingCountdown({
  targetAt,
  onEnd,
  children,
}: ListingCountdownProps) {
  const targetTime = targetAt.getTime();
  const [now, setNow] = useState(() => new Date());
  const hasTriggeredEndRef = useRef(false);
  const handleEnd = useEffectEvent(() => {
    onEnd?.();
  });

  useEffect(() => {
    if (now.getTime() >= targetTime) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [now, targetTime]);

  useEffect(() => {
    if (now.getTime() < targetTime || hasTriggeredEndRef.current) {
      return;
    }

    hasTriggeredEndRef.current = true;
    handleEnd();
  }, [handleEnd, now, targetTime]);

  return children({
    formatted: formatTimeRemaining(targetAt, now),
    urgency: getCountdownUrgencyTier(targetAt, now),
    isEnded: now.getTime() >= targetTime,
  });
}
