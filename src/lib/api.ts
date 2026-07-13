// Type-safe wrapper around the IPC bridge exposed by preload.ts

export interface User {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface JobMaterial {
  id: string;
  commodityId: number | null;
  name: string;
  quantity: number;
  unit: string;
  yieldPercent: number | null;
}

export interface Job {
  id: string;
  stationId: number | null;
  stationName: string;
  systemName: string | null;
  method: string | null;
  startedAt: string;
  durationSec: number;
  finishesAt: string;
  status: "running" | "done" | "collected" | "cancelled";
  note: string | null;
  materials: JobMaterial[];
}

export type CreateJobInput = Omit<Job, "id">;

declare global {
  interface Window {
    api: {
      auth: {
        getOrCreateLocal(): Promise<{ token: string; user: User }>;
      };
      jobs: {
        list(token: string): Promise<Job[]>;
        create(token: string, data: CreateJobInput): Promise<Job>;
        update(token: string, id: string, data: { status?: string; note?: string }): Promise<void>;
        delete(token: string, id: string): Promise<void>;
      };
      onUpdateAvailable(cb: (version: string) => void): void;
      onUpdateDownloaded(cb: (version: string) => void): void;
      onUpdateError(cb: (msg: string) => void): void;
      onUpdateNotAvailable(cb: () => void): void;
      installUpdate(): Promise<void>;
      checkForUpdates(): Promise<{ ok: boolean; error?: string }>;
      fetchNews(): Promise<{ ok: boolean; source?: string; items: { title: string; link: string; date: string }[] }>;
      getVersion(): Promise<string>;
    };
  }
}

export const api = {
  auth: {
    getOrCreateLocal: () => window.api.auth.getOrCreateLocal(),
  },
  jobs: {
    list: (t: string) => window.api.jobs.list(t),
    create: (t: string, d: CreateJobInput) => window.api.jobs.create(t, d),
    update: (t: string, id: string, d: { status?: string; note?: string }) =>
      window.api.jobs.update(t, id, d),
    delete: (t: string, id: string) => window.api.jobs.delete(t, id),
  },
};
