import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdInfoDialog from "./AdInfoDialog";
import RatingDialog from "./RatingDialog";
import { Gift } from "lucide-react";

export default function AdManager({ onContinue, children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const processingRef = useRef(false);
  const clickTimeoutRef = useRef(null);

  const { data: adSettings, isLoading, error } = useQuery({
    queryKey: ['ad-settings', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      try {
        const settings = await base44.entities.UserAdSettings.list();
        if (settings.length > 0) {
          return settings[0];
        }
        return await base44.entities.UserAdSettings.create({
          free_attempts: 3,
          has_seen_info_today: false,
          ads_viewed_today: 0,
          has_rated: false,
          last_reset_date: new Date().toISOString().split('T')[0]
        });
      } catch (error) {
        console.error("Error loading ad settings:", error);
        return null;
      }
    },
    enabled: isUserLoaded && !!user?.email,
    staleTime: 30 * 60 * 1000,
    cacheTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 2,
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsUserLoaded(true);
      } catch (error) {
        console.error("Error loading user:", error);
        setIsUserLoaded(true);
      }
    };
    loadUser();
  }, []);

  const updateAdSettingsMutation = useMutation({
    mutationFn: (data) => {
      if (!adSettings?.id) throw new Error("No ad settings found for update.");
      return base44.entities.UserAdSettings.update(adSettings.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-settings'] });
    },
    onError: (error) => {
      console.error("Error updating ad settings:", error);
    },
  });

  // Check if need to reset daily counters
  useEffect(() => {
    if (!adSettings) return;
    
    const today = new Date().toISOString().split('T')[0];
    if (adSettings.last_reset_date !== today) {
      updateAdSettingsMutation.mutate({
        free_attempts: 3,
        has_seen_info_today: false,
        ads_viewed_today: 0,
        last_reset_date: today
      });
    }
  }, [adSettings]);

  // Auto-start when component mounts and onContinue is provided
  useEffect(() => {
    if (!user || !adSettings || processingRef.current || !onContinue) return;
    
    processingRef.current = true;
    checkAndProceed();
  }, [user, adSettings, onContinue]);

  const checkAndProceed = async () => {
    if (!adSettings || isProcessing) return;

    // If no onContinue provided, just render children
    if (!onContinue) {
      return;
    }

    setIsProcessing(true);

    try {
      // Check if user is premium
      if (user?.is_premium) {
        onContinue();
        return;
      }

      // Check free attempts
      if (adSettings.free_attempts > 0) {
        await updateAdSettingsMutation.mutateAsync({
          free_attempts: adSettings.free_attempts - 1
        });
        onContinue();
        return;
      }

      // Check if bonus is active
      const today = new Date().toISOString().split('T')[0];
      if (adSettings.bonus_active_until && adSettings.bonus_active_until >= today) {
        onContinue();
        return;
      }

      // Show info dialog or ad
      if (!adSettings.has_seen_info_today) {
        setShowInfoDialog(true);
        await updateAdSettingsMutation.mutateAsync({
          has_seen_info_today: true
        });
      } else {
        handleWatchAd();
      }
    } catch (error) {
      console.error("Error in checkAndProceed:", error);
      // Continue anyway to not block user
      if (onContinue) {
        onContinue();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWatchAd = async () => {
    console.log("Showing rewarded ad...");
    
    // Simulate ad viewing - 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      await updateAdSettingsMutation.mutateAsync({
        ads_viewed_today: (adSettings.ads_viewed_today || 0) + 1
      });
      
      setShowInfoDialog(false);
      if (onContinue) {
        onContinue();
      }
    } catch (error) {
      console.error("Error watching ad:", error);
      // Continue anyway to not block user
      if (onContinue) {
        onContinue();
      }
    }
  };

  const handleOpenRating = () => {
    setShowInfoDialog(false);
    setShowRatingDialog(true);
  };

  const handleSubmitRating = async (rating) => {
    try {
      if (rating === 5) {
        const bonusEndDate = new Date();
        bonusEndDate.setDate(bonusEndDate.getDate() + 7);
        
        await updateAdSettingsMutation.mutateAsync({
          has_rated: true,
          rating_date: new Date().toISOString(),
          bonus_active_until: bonusEndDate.toISOString().split('T')[0],
          free_attempts: 30
        });
        
        setShowRatingDialog(false);
        alert("🎉 תודה על הדירוג! קיבלת שבוע חופשי מפרסומות!");
        if (onContinue) {
          onContinue();
        }
      } else {
        alert("הבונוס ניתן רק לדירוג 5 כוכבים ⭐⭐⭐⭐⭐");
        setShowRatingDialog(false);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("אירעה שגיאה בעת שליחת הדירוג. אנא נסה שוב.");
    }
  };

  const isBonusActive = () => {
    if (!adSettings?.bonus_active_until) return false;
    const today = new Date().toISOString().split('T')[0];
    return adSettings.bonus_active_until >= today;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // If no onContinue provided, just render children without any ads logic
  if (!onContinue) {
    return <>{children}</>;
  }

  // Show loading while checking
  if (!isUserLoaded || isLoading) {
    return children;
  }

  return (
    <>
      {children}

      {isBonusActive() && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <Gift className="w-4 h-4" />
          <span className="text-sm font-semibold">
            שבוע חופשי עד {new Date(adSettings.bonus_active_until).toLocaleDateString('he-IL')}
          </span>
        </div>
      )}

      {!user?.is_premium && !isBonusActive() && adSettings && !isProcessing && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white text-gray-900 px-4 py-2 rounded-full shadow-md border border-gray-200">
          <span className="text-sm font-semibold">
            נשארו {adSettings.free_attempts} ניסיונות חינם היום
          </span>
        </div>
      )}

      <AdInfoDialog
        open={showInfoDialog}
        onOpenChange={setShowInfoDialog}
        onWatchAd={handleWatchAd}
        onRate={handleOpenRating}
        hasRated={adSettings?.has_rated || false}
      />

      <RatingDialog
        open={showRatingDialog}
        onOpenChange={setShowRatingDialog}
        onSubmitRating={handleSubmitRating}
      />
    </>
  );
}