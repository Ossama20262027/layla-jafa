import React, { useState, useEffect } from 'react';
import {
  getChildProfile,
  saveChildProfile,
  getNightRecords,
  saveNightRecord,
  deleteNightRecord,
  getRewards,
  getDailyHabits,
  getSettings,
  saveSettings,
} from './utils/storage';
import { ChildProfile, NightRecord, Rewards, DailyHabits, Settings, ViewType } from './types';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CelebrationModal } from './components/CelebrationModal';
import { SettingsModal } from './components/SettingsModal';

import { SplashScreen } from './views/SplashScreen';
import { OnboardingView } from './views/OnboardingView';
import { ChildProfileSetupView } from './views/ChildProfileSetupView';
import { DashboardView } from './views/DashboardView';
import { GardenView } from './views/GardenView';
import { BedtimeRoutineView } from './views/BedtimeRoutineView';
import { RewardsView } from './views/RewardsView';
import { StatsView } from './views/StatsView';
import { SmartAssistantView } from './views/SmartAssistantView';
import { DoctorConsultationView } from './views/DoctorConsultationView';
import { ParentTipsView } from './views/ParentTipsView';
import { ReportView } from './views/ReportView';
import { BackupView } from './views/BackupView';
import { MoreMenuView } from './views/MoreMenuView';
import { AboutView } from './views/AboutView';
import { NightRecordModal } from './views/NightRecordModal';

export default function App() {
  const [child, setChild] = useState<ChildProfile>(getChildProfile());
  const [nightRecords, setNightRecords] = useState<NightRecord[]>(getNightRecords());
  const [rewards, setRewards] = useState<Rewards>(getRewards());
  const [settings, setSettings] = useState<Settings>(getSettings());

  const todayStr = new Date().toISOString().split('T')[0];
  const [dailyHabits, setDailyHabits] = useState<DailyHabits | null>(getDailyHabits(todayStr));

  // Determine initial view: if onboarding not completed, start with splash screen
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const hasSeenSplash = localStorage.getItem('layla_has_seen_splash');
    if (!hasSeenSplash) return 'splash';
    const hasProfile = localStorage.getItem('layla_child_profile');
    if (!hasProfile) return 'profile_setup';
    return 'dashboard';
  });

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<NightRecord | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [celebration, setCelebration] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    type: 'dry' | 'routine' | 'badge' | 'encouragement';
    starsCount?: number;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    type: 'dry',
    starsCount: 0,
  });

  // Keep state synchronized
  const refreshAllState = () => {
    setChild(getChildProfile());
    setNightRecords(getNightRecords());
    setRewards(getRewards());
    setSettings(getSettings());
    setDailyHabits(getDailyHabits(todayStr));
  };

  useEffect(() => {
    refreshAllState();
  }, []);

  // Handlers for Onboarding Flow
  const handleSplashStart = () => {
    localStorage.setItem('layla_has_seen_splash', 'true');
    setCurrentView('onboarding');
  };

  const handleOnboardingComplete = () => {
    const existingProfile = localStorage.getItem('layla_child_profile');
    if (existingProfile) {
      setCurrentView('dashboard');
    } else {
      setCurrentView('profile_setup');
    }
  };

  const handleSaveProfile = (updatedProfile: ChildProfile) => {
    saveChildProfile(updatedProfile);
    setChild(updatedProfile);
    setCurrentView('dashboard');
  };

  // Toggle child mode
  const handleToggleChildMode = () => {
    const updated = { ...settings, childMode: !settings.childMode };
    saveSettings(updated);
    setSettings(updated);
    // If transitioning into Child Mode from an adult-only screen, redirect to dashboard
    if (updated.childMode && ['doctor', 'report', 'backup', 'tips', 'stats', 'profile'].includes(currentView)) {
      setCurrentView('dashboard');
    }
  };

  // Night Record Saving
  const handleSaveNightRecord = (record: NightRecord) => {
    const { updatedRewards, newBadgesUnlocked, starsEarned } = saveNightRecord(record);
    setNightRecords(getNightRecords());
    setRewards(updatedRewards);
    setIsRecordModalOpen(false);

    if (newBadgesUnlocked.length > 0) {
      const b = newBadgesUnlocked[0];
      setCelebration({
        isOpen: true,
        title: `🏆 مبروك شارة جديدة: ${b.title}!`,
        subtitle: `إنجاز رائع يا {name}! ${b.description}`,
        type: 'badge',
        starsCount: starsEarned,
      });
    } else if (record.dry) {
      setCelebration({
        isOpen: true,
        title: '🎉 أحسنت يا {name}!',
        subtitle: 'ليلة جافة وسرير نظيف ومشرق! فخورون بك جداً.',
        type: 'dry',
        starsCount: starsEarned,
      });
    } else {
      setCelebration({
        isOpen: true,
        title: '❤️ لا بأس يا {name}، غدًا فرصة جديدة!',
        subtitle: 'جهدك وبطولتك مستمرة دائماً. سريرك جاهز لليلة دافئة قادمة!',
        type: 'encouragement',
        starsCount: starsEarned,
      });
    }
  };

  const handleEditRecord = (record: NightRecord) => {
    setRecordToEdit(record);
    setIsRecordModalOpen(true);
  };

  const handleDeleteRecord = (id: string) => {
    deleteNightRecord(id);
    refreshAllState();
  };

  const handleToggleDarkMode = () => {
    const updated = { ...settings, darkMode: !settings.darkMode };
    saveSettings(updated);
    setSettings(updated);
  };

  // Routine Completed
  const handleRoutineCompleted = (starsEarned: number) => {
    refreshAllState();
    setCelebration({
      isOpen: true,
      title: '🌙 روتين نوم متكامل يا {name}!',
      subtitle: 'أنجزت جميع خطوات النوم بنجاح واستعداد هادئ ومريح.',
      type: 'routine',
      starsCount: starsEarned,
    });
  };

  // Safe navigation that respects child mode
  const handleNavigate = (view: ViewType) => {
    if (settings.childMode && ['doctor', 'report', 'backup', 'tips'].includes(view)) {
      setCurrentView('dashboard');
      return;
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render introductory screens when needed
  if (currentView === 'splash') {
    return <SplashScreen onStart={handleSplashStart} />;
  }

  if (currentView === 'onboarding') {
    return <OnboardingView child={child} onComplete={handleOnboardingComplete} />;
  }

  if (currentView === 'profile_setup') {
    return (
      <div className="min-h-screen bg-slate-950">
        <ChildProfileSetupView
          initialProfile={child}
          onSave={handleSaveProfile}
          isInitialSetup={true}
        />
      </div>
    );
  }

  const todayRecord = nightRecords.find(r => r.date === todayStr);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white pb-12 font-sans" dir="rtl">
      {/* Offline Status indicator */}
      <OfflineIndicator />

      {/* Top Navbar */}
      <Navbar
        child={child}
        stars={rewards.stars}
        settings={settings}
        onToggleChildMode={handleToggleChildMode}
        onNavigateToProfile={() => handleNavigate('profile')}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Main App Body View */}
      <main className="w-full">
        {currentView === 'dashboard' && (
          <DashboardView
            child={child}
            nightRecords={nightRecords}
            rewards={rewards}
            dailyHabits={dailyHabits}
            settings={settings}
            onOpenRecordModal={() => {
              setRecordToEdit(null);
              setIsRecordModalOpen(true);
            }}
            onNavigateToGarden={() => handleNavigate('garden')}
            onNavigateToRoutine={() => handleNavigate('routine')}
            onNavigateToRewards={() => handleNavigate('rewards')}
            onNavigateToStats={() => handleNavigate('stats')}
          />
        )}

        {currentView === 'garden' && (
          <GardenView
            child={child}
            nightRecords={nightRecords}
            onOpenRecordModal={() => {
              setRecordToEdit(null);
              setIsRecordModalOpen(true);
            }}
          />
        )}

        {currentView === 'routine' && (
          <BedtimeRoutineView
            child={child}
            onRoutineCompleted={handleRoutineCompleted}
            onBack={() => handleNavigate('dashboard')}
          />
        )}

        {currentView === 'rewards' && (
          <RewardsView child={child} rewards={rewards} />
        )}

        {currentView === 'stats' && (
          <StatsView
            child={child}
            nightRecords={nightRecords}
            onOpenRecordModal={() => {
              setRecordToEdit(null);
              setIsRecordModalOpen(true);
            }}
            onEditRecord={handleEditRecord}
            onDeleteRecord={handleDeleteRecord}
            onBack={() => handleNavigate('dashboard')}
          />
        )}

        {currentView === 'assistant' && (
          <SmartAssistantView
            child={child}
            nightRecords={nightRecords}
            onNavigateToDoctor={() => handleNavigate('doctor')}
            onNavigateToTips={() => handleNavigate('tips')}
          />
        )}

        {currentView === 'doctor' && (
          <DoctorConsultationView
            child={child}
            onBack={() => handleNavigate('more')}
          />
        )}

        {currentView === 'tips' && (
          <ParentTipsView
            child={child}
            onBack={() => handleNavigate('more')}
          />
        )}

        {currentView === 'report' && (
          <ReportView
            child={child}
            nightRecords={nightRecords}
            onBack={() => handleNavigate('more')}
          />
        )}

        {currentView === 'profile' && (
          <ChildProfileSetupView
            initialProfile={child}
            onSave={(updated) => {
              handleSaveProfile(updated);
              handleNavigate('dashboard');
            }}
            isInitialSetup={false}
            onCancel={() => handleNavigate('dashboard')}
          />
        )}

        {currentView === 'backup' && (
          <BackupView
            child={child}
            onDataImported={refreshAllState}
            onDataReset={() => {
              refreshAllState();
              setCurrentView('splash');
            }}
            onBack={() => handleNavigate('more')}
          />
        )}

        {currentView === 'about' && (
          <AboutView
            onBack={() => handleNavigate('more')}
          />
        )}

        {currentView === 'more' && (
          <MoreMenuView
            child={child}
            settings={settings}
            onNavigate={handleNavigate}
            onToggleChildMode={handleToggleChildMode}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />
        )}
      </main>

      {/* Persistent Bottom Navigation */}
      <BottomNav
        currentView={currentView}
        onSelectView={handleNavigate}
        isChildMode={settings.childMode}
      />

      {/* Modals */}
      <NightRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setRecordToEdit(null);
        }}
        child={child}
        onSaveRecord={handleSaveNightRecord}
        existingRecordForToday={todayRecord}
        recordToEdit={recordToEdit}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          saveSettings(newSettings);
          setSettings(newSettings);
        }}
        onOpenAbout={() => handleNavigate('about')}
      />

      <CelebrationModal
        isOpen={celebration.isOpen}
        onClose={() => setCelebration({ ...celebration, isOpen: false })}
        title={celebration.title}
        subtitle={celebration.subtitle}
        type={celebration.type}
        starsCount={celebration.starsCount}
        childName={child.name}
      />
    </div>
  );
}
