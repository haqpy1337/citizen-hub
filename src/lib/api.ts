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
        register(username: string, password: string): Promise<{ token: string; user: User }>;
        login(username: string, password: string): Promise<{ token: string; user: User }>;
        logout(token: string): Promise<void>;
        me(token: string): Promise<User | null>;
      };
      jobs: {
        list(token: string): Promise<Job[]>;
        create(token: string, data: CreateJobInput): Promise<Job>;
        update(token: string, id: string, data: { status?: string; note?: string }): Promise<void>;
        delete(token: string, id: string): Promise<void>;
      };
      onUpdateAvailable(cb: () => void): void;
      onUpdateDownloaded(cb: () => void): void;
      installUpdate(): Promise<void>;
    };
  }
}

export const api = {
  auth: {
    register: (u: string, p: string) => window.api.auth.register(u, p),
    login: (u: string, p: string) => window.api.auth.login(u, p),
    logout: (t: string) => window.api.auth.logout(t),
    me: (t: string) => window.api.auth.me(t),
  },
  jobs: {
    list: (t: string) => window.api.jobs.list(t),
    create: (t: string, d: CreateJobInput) => window.api.jobs.create(t, d),
    update: (t: string, id: string, d: { status?: string; note?: string }) =>
      window.api.jobs.update(t, id, d),
    delete: (t: string, id: string) => window.api.jobs.delete(t, id),
  },
};
