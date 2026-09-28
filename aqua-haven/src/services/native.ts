import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

// ios/App/App/AquaNativePlugin.swift ile birebir eşleşir
export interface AquaNativePlugin {
  gcSignIn(): Promise<{ authenticated: boolean }>;
  gcSubmitScores(opts: { scores: { id: string; value: number }[] }): Promise<void>;
  gcReportAchievements(opts: { achievements: { id: string; percent: number }[] }): Promise<void>;
  gcShow(opts: { view: 'dashboard' | 'leaderboards' | 'achievements' }): Promise<void>;
  shareImage(opts: { base64: string; text?: string }): Promise<{ completed: boolean; activity: string }>;
  addListener(event: 'gcAuth', cb: (e: { authenticated: boolean }) => void): Promise<PluginListenerHandle>;
}

export const AquaNative = registerPlugin<AquaNativePlugin>('AquaNative');
