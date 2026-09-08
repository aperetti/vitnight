import { KeyMappingConfig } from '../shared/types';
import { DEFAULT_KEY_MAPPINGS, WASD_ALIASES } from '../shared/constants';

const SETTINGS_STORAGE_KEY = 'vitnight_key_mappings';

export class SettingsManager {
  public keyMappings: KeyMappingConfig;
  public tickRate: number = 5;
  public isFirebaseConnected: boolean = false;
  public userEmail: string | null = null;

  constructor() {
    this.keyMappings = this.loadLocalKeyMappings();
  }

  public loadLocalKeyMappings(): KeyMappingConfig {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_KEY_MAPPINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Could not read key mappings from localStorage', e);
    }
    return { ...DEFAULT_KEY_MAPPINGS };
  }

  public saveKeyMapping(action: keyof KeyMappingConfig, newKey: string) {
    this.keyMappings[action] = newKey;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.keyMappings));
    } catch (e) {
      console.warn('Could not save key mappings to localStorage', e);
    }
  }

  public resetDefaults() {
    this.keyMappings = { ...DEFAULT_KEY_MAPPINGS };
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch (e) {
      console.warn('Could not reset key mappings in localStorage', e);
    }
  }

  public getActionForKey(code: string, key?: string): keyof KeyMappingConfig | null {
    const candidates = [code, key].filter(Boolean) as string[];
    // Check primary key mappings
    for (const [action, mappedKey] of Object.entries(this.keyMappings)) {
      if (candidates.some(c => c === mappedKey || c.toLowerCase() === mappedKey.toLowerCase())) {
        return action as keyof KeyMappingConfig;
      }
    }
    // Check convenient WASD / Numpad / Vi aliases
    for (const c of candidates) {
      if (WASD_ALIASES[c]) {
        return WASD_ALIASES[c] as keyof KeyMappingConfig;
      }
    }
    return null;
  }

  // Optional Firebase SSO Integration
  public async initFirebaseSSO(firebaseConfig?: any): Promise<boolean> {
    if (!firebaseConfig) return false;
    try {
      const { initializeApp } = await import('firebase/app');
      const { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } = await import('firebase/auth');
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);

      onAuthStateChanged(auth, (user) => {
        if (user) {
          this.isFirebaseConnected = true;
          this.userEmail = user.email || user.displayName || 'Authenticated User';
          console.log('Firebase SSO authenticated:', this.userEmail);
        } else {
          this.isFirebaseConnected = false;
          this.userEmail = null;
        }
      });
      return true;
    } catch (err) {
      console.warn('Firebase SSO initialization skipped or failed:', err);
      return false;
    }
  }
}
