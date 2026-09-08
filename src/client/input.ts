import { SettingsManager } from './settings';
import { KeyMappingConfig } from '../shared/types';

export class InputManager {
  private settings: SettingsManager;
  public onMove?: (dx: number, dy: number) => void;
  public onAction?: (actionType: 'attack' | 'special' | 'mine' | 'craft' | 'revive' | 'wait') => void;
  public onToggleSettings?: () => void;
  public onTogglePartySheet?: () => void;
  public onToggleInventory?: () => void;
  public onPickupItem?: () => void;
  public onCastHotbarSkill?: (slotIndex: number) => void;

  public isLookMode: boolean = false;
  public onToggleLook?: () => void;
  public onLookMove?: (dx: number, dy: number) => void;
  public onLookInteract?: () => void;
  public onExitLook?: () => void;
  public onToggleMap?: () => void;

  public isAiming: boolean = false;
  public onAimMove?: (dx: number, dy: number) => void;
  public onAimConfirm?: () => void;
  public onAimCancel?: () => void;

  public rebindingAction: keyof KeyMappingConfig | null = null;
  public onRebindComplete?: (action: keyof KeyMappingConfig, newKey: string) => void;

  // Hold-down movement repeat timers & active state
  private heldMovement: { action: string; dx: number; dy: number; mode: 'move' | 'look' | 'aim' } | null = null;
  private moveInitialTimeout: number | null = null;
  private moveRepeatInterval: number | null = null;
  private heldMovementKeys: Map<string, { action: string; dx: number; dy: number }> = new Map();

  private static MOVEMENT_DIRECTIONS: Record<string, [number, number]> = {
    moveUp: [0, -1],
    moveDown: [0, 1],
    moveLeft: [-1, 0],
    moveRight: [1, 0],
    moveUpLeft: [-1, -1],
    moveUpRight: [1, -1],
    moveDownLeft: [-1, 1],
    moveDownRight: [1, 1]
  };

  constructor(settings: SettingsManager) {
    this.settings = settings;
    this.setupListeners();
  }

  private startHeldMovement(action: string, dx: number, dy: number, mode: 'move' | 'look' | 'aim') {
    this.stopHeldMovement();

    this.heldMovement = { action, dx, dy, mode };

    const fire = () => {
      if (mode === 'aim') {
        this.onAimMove?.(dx, dy);
      } else if (mode === 'look') {
        this.onLookMove?.(dx, dy);
      } else {
        this.onMove?.(dx, dy);
      }
    };

    // Step 1: Immediate step on key press
    fire();

    // Step 2: Initial hold delay (170ms) before continuous repetition
    this.moveInitialTimeout = window.setTimeout(() => {
      fire();

      // Step 3: Steady cadence of 100ms per step while key is held down
      this.moveRepeatInterval = window.setInterval(() => {
        fire();
      }, 100);
    }, 170);
  }

  public stopHeldMovement() {
    if (this.moveInitialTimeout !== null) {
      clearTimeout(this.moveInitialTimeout);
      this.moveInitialTimeout = null;
    }
    if (this.moveRepeatInterval !== null) {
      clearInterval(this.moveRepeatInterval);
      this.moveRepeatInterval = null;
    }
    this.heldMovement = null;
  }

  private setupListeners() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Prevent browser scrolling on arrow keys, space, etc.
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }

      // Do not hijack typing if an input field is focused
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      if (this.rebindingAction) {
        e.preventDefault();
        const action = this.rebindingAction;
        this.rebindingAction = null;
        this.settings.saveKeyMapping(action, e.code);
        this.onRebindComplete?.(action, e.code);
        return;
      }

      // Map toggle (M)
      if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
        if (e.repeat) return;
        e.preventDefault();
        this.stopHeldMovement();
        this.onToggleMap?.();
        return;
      }

      // Semicolon (;) or look toggle
      if (e.code === 'Semicolon' || e.key === ';') {
        if (e.repeat) return;
        e.preventDefault();
        this.stopHeldMovement();
        this.onToggleLook?.();
        return;
      }

      // Look Mode interception
      if (this.isLookMode) {
        if (e.code === 'Escape') {
          if (e.repeat) return;
          e.preventDefault();
          this.stopHeldMovement();
          this.onExitLook?.();
          return;
        }
        if (e.code === 'Enter' || e.code === 'Space') {
          if (e.repeat) return;
          e.preventDefault();
          this.onLookInteract?.();
          return;
        }

        const action = this.settings.getActionForKey(e.code, e.key);
        if (action && InputManager.MOVEMENT_DIRECTIONS[action]) {
          e.preventDefault();
          if (e.repeat) return; // Continuous movement is driven by our interval timer

          const [dx, dy] = InputManager.MOVEMENT_DIRECTIONS[action];
          this.heldMovementKeys.set(e.code, { action, dx, dy });
          this.startHeldMovement(action, dx, dy, 'look');
          return;
        }
        return;
      }

      // Aiming Mode interception (Laser rifle, Cryo ice blast, Fireballs, Skills)
      if (this.isAiming) {
        if (e.code === 'Escape') {
          if (e.repeat) return;
          e.preventDefault();
          this.stopHeldMovement();
          this.onAimCancel?.();
          return;
        }
        if (e.code === 'Enter' || e.code === 'Space') {
          if (e.repeat) return;
          e.preventDefault();
          this.stopHeldMovement();
          this.onAimConfirm?.();
          return;
        }

        // Hotbar skills while aiming: allow triggering/aiming other skills
        if (['Digit5', '5'].includes(e.code) || ['Digit5', '5'].includes(e.key)) {
          e.preventDefault();
          if (e.repeat) return;
          this.onCastHotbarSkill?.(0);
          return;
        }
        if (['Digit6', '6'].includes(e.code) || ['Digit6', '6'].includes(e.key)) {
          e.preventDefault();
          if (e.repeat) return;
          this.onCastHotbarSkill?.(1);
          return;
        }
        if (['Digit7', '7'].includes(e.code) || ['Digit7', '7'].includes(e.key)) {
          e.preventDefault();
          if (e.repeat) return;
          this.onCastHotbarSkill?.(2);
          return;
        }

        const action = this.settings.getActionForKey(e.code, e.key);
        if (action && InputManager.MOVEMENT_DIRECTIONS[action]) {
          e.preventDefault();
          if (e.repeat) return;
          const [dx, dy] = InputManager.MOVEMENT_DIRECTIONS[action];
          this.heldMovementKeys.set(e.code, { action, dx, dy });
          this.startHeldMovement(action, dx, dy, 'aim');
          return;
        }

        if (action === 'attack' || action === 'specialAbility') {
          e.preventDefault();
          if (e.repeat) return;
          this.onAction?.(action === 'attack' ? 'attack' : 'special');
          return;
        }
        return;
      }

      const action = this.settings.getActionForKey(e.code, e.key);
      if (!action) return;

      // Handle continuous movement when holding movement keys
      if (InputManager.MOVEMENT_DIRECTIONS[action]) {
        e.preventDefault();
        if (e.repeat) return; // Continuous movement is driven by our interval timer

        const [dx, dy] = InputManager.MOVEMENT_DIRECTIONS[action];
        this.heldMovementKeys.set(e.code, { action, dx, dy });
        this.startHeldMovement(action, dx, dy, 'move');
        return;
      }

      // Non-movement actions ignore key repeat to prevent unintended spam
      if (e.repeat) {
        return;
      }

      // Hotbar skill triggers [5], [6], [7]
      if (['Digit5', '5'].includes(e.code) || ['Digit5', '5'].includes(e.key)) {
        this.onCastHotbarSkill?.(0);
        return;
      }
      if (['Digit6', '6'].includes(e.code) || ['Digit6', '6'].includes(e.key)) {
        this.onCastHotbarSkill?.(1);
        return;
      }
      if (['Digit7', '7'].includes(e.code) || ['Digit7', '7'].includes(e.key)) {
        this.onCastHotbarSkill?.(2);
        return;
      }

      switch (action) {
        case 'waitTurn': this.onAction?.('wait'); break;
        case 'attack': this.onAction?.('attack'); break;
        case 'specialAbility': this.onAction?.('special'); break;
        case 'mine': this.onAction?.('mine'); break;
        case 'craft': this.onAction?.('craft'); break;
        case 'revive': this.onAction?.('revive'); break;
        case 'charSheet': this.onTogglePartySheet?.(); break;
        case 'inventory': this.onToggleInventory?.(); break;
        case 'pickup': this.onPickupItem?.(); break;
        case 'settings': this.onToggleSettings?.(); break;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.heldMovementKeys.delete(e.code);

      const action = this.settings.getActionForKey(e.code, e.key);
      if (this.heldMovement && (action === this.heldMovement.action)) {
        this.stopHeldMovement();

        // If another movement key is still held down, seamlessly resume that direction
        if (this.heldMovementKeys.size > 0) {
          const nextMovement = Array.from(this.heldMovementKeys.values()).pop();
          if (nextMovement) {
            const currentMode: 'move' | 'look' | 'aim' = this.isAiming ? 'aim' : this.isLookMode ? 'look' : 'move';
            this.startHeldMovement(nextMovement.action, nextMovement.dx, nextMovement.dy, currentMode);
          }
        }
      }
    });

    window.addEventListener('blur', () => {
      this.heldMovementKeys.clear();
      this.stopHeldMovement();
    });
  }

  public startRebinding(action: keyof KeyMappingConfig) {
    this.rebindingAction = action;
  }
}
