import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Clock, Target, Scroll, Award, DollarSign, Users, Shield,
  AlertCircle,
} from 'lucide-react';
import { adminFetch } from '@/api/adminClient';
import { AdminPlayerHeader } from '@/components/admin/player-detail/AdminPlayerHeader';
import { AdminPlayerStats } from '@/components/admin/player-detail/AdminPlayerStats';
import { AdminPlayerActions } from '@/components/admin/AdminPlayerActions';
import {
  TabSkeleton,
  TimelineTab,
  ModesTab,
  QuestsTab,
  AchievementsTab,
  FinanceTab,
  SocialTab,
} from '@/components/admin/player-detail/PlayerTabContent';
import type { PlayerDetailData, TabId } from '@/components/admin/player-detail/types';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Activity size={14} /> },
  { id: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
  { id: 'modes', label: 'Modes', icon: <Target size={14} /> },
  { id: 'quests', label: 'Quests', icon: <Scroll size={14} /> },
  { id: 'achievements', label: 'Achievements', icon: <Award size={14} /> },
  { id: 'finance', label: 'Finance', icon: <DollarSign size={14} /> },
  { id: 'social', label: 'Social', icon: <Users size={14} /> },
  { id: 'actions', label: 'Admin', icon: <Shield size={14} /> },
];

export function AdminPlayerDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PlayerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const credentials = sessionStorage.getItem('admin_credentials') || '';

  const loadPlayerData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/players/${userId}`, credentials);
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Player not found' : `Failed to load player (${res.status})`);
      }
      const json = await res.json();
      setData(json.data || json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, credentials]);

  useEffect(() => {
    loadPlayerData();
  }, [loadPlayerData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-telegram-bg p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-telegram-hint/15 rounded w-32" />
          <div className="bg-telegram-secondaryBg rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-telegram-hint/15 rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-telegram-hint/15 rounded w-40" />
                <div className="h-3 bg-telegram-hint/10 rounded w-24" />
              </div>
            </div>
            <div className="h-2 bg-telegram-hint/10 rounded-full" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 bg-telegram-hint/10 rounded-lg flex-1" />
            ))}
          </div>
          <TabSkeleton />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
          <p className="text-sm text-red-400 mb-3">{error || 'Failed to load player'}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm text-telegram-link border border-telegram-link/30 rounded-xl"
            >
              Go Back
            </button>
            <button
              onClick={loadPlayerData}
              className="px-4 py-2 text-sm bg-telegram-button text-telegram-buttonText rounded-xl"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderTabContent() {
    if (!data) return null;
    switch (activeTab) {
      case 'overview': return <AdminPlayerStats data={data} />;
      case 'timeline': return <TimelineTab data={data} />;
      case 'modes': return <ModesTab data={data} />;
      case 'quests': return <QuestsTab data={data} />;
      case 'achievements': return <AchievementsTab data={data} />;
      case 'finance': return <FinanceTab data={data} />;
      case 'social': return <SocialTab data={data} />;
      case 'actions':
        return (
          <AdminPlayerActions
            userId={data.user.id}
            currentTier={data.user.tier}
            currentXp={data.user.xp}
            onActionComplete={loadPlayerData}
          />
        );
      default: return null;
    }
  }

  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text pb-6">
      <AdminPlayerHeader user={data.user} />

      {/* Tabs */}
      <div className="px-4 mt-4 mb-3">
        <div
          className="flex gap-1 overflow-x-auto hide-scrollbar pb-1"
          role="tablist"
          aria-label="Player detail tabs"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-telegram-button text-telegram-buttonText'
                  : 'bg-telegram-secondaryBg text-telegram-hint border border-telegram-hint/10'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
