export interface FirebaseOptions {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export interface FirebaseApp {
  name: string;
  options: FirebaseOptions;
}

const apps: FirebaseApp[] = [];

export function initializeApp(options: FirebaseOptions): FirebaseApp {
  const app = {
    name: "[DEFAULT]",
    options,
  };
  apps.push(app);
  return app;
}

export function getApps(): FirebaseApp[] {
  return apps;
}

export function getApp(): FirebaseApp {
  const app = apps[0];
  if (!app) {
    throw new Error("Firebase app is not initialized.");
  }
  return app;
}
