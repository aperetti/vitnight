import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InputManager } from '../src/client/input';
import { SettingsManager } from '../src/client/settings';

describe('Escape Key Handling across Windows & Modals', () => {
  let settings: SettingsManager;
  let input: InputManager;

  beforeEach(() => {
    // Setup minimal DOM for keydown event listeners and activeElement
    (global as any).window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    (global as any).document = {
      activeElement: null
    };

    settings = new SettingsManager();
    input = new InputManager(settings as any);
  });

  it('registers onEscape callback and invokes it on Escape keydown', () => {
    let keydownListener: (e: any) => void = () => {};
    (global as any).window.addEventListener = vi.fn((event, handler) => {
      if (event === 'keydown') keydownListener = handler;
    });

    const testInput = new InputManager(settings as any);
    const onEscapeMock = vi.fn().mockReturnValue(true);
    testInput.onEscape = onEscapeMock;

    // Simulate Escape key press with code: 'Escape'
    const event = {
      code: 'Escape',
      key: 'Escape',
      repeat: false,
      preventDefault: vi.fn()
    };
    keydownListener(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(onEscapeMock).toHaveBeenCalled();
  });

  it('handles Escape even when key is Escape but code is undefined or different', () => {
    let keydownListener: (e: any) => void = () => {};
    (global as any).window.addEventListener = vi.fn((event, handler) => {
      if (event === 'keydown') keydownListener = handler;
    });

    const testInput = new InputManager(settings as any);
    const onEscapeMock = vi.fn().mockReturnValue(true);
    testInput.onEscape = onEscapeMock;

    const event = {
      code: 'KeyEsc',
      key: 'Escape',
      repeat: false,
      preventDefault: vi.fn()
    };
    keydownListener(event);

    expect(onEscapeMock).toHaveBeenCalled();
  });

  it('blurs active input element on Escape before calling onEscape', () => {
    let keydownListener: (e: any) => void = () => {};
    (global as any).window.addEventListener = vi.fn((event, handler) => {
      if (event === 'keydown') keydownListener = handler;
    });

    const testInput = new InputManager(settings as any);
    const onEscapeMock = vi.fn().mockReturnValue(true);
    testInput.onEscape = onEscapeMock;

    const blurMock = vi.fn();
    (global as any).document.activeElement = {
      tagName: 'INPUT',
      blur: blurMock
    };

    const event = {
      code: 'Escape',
      key: 'Escape',
      repeat: false,
      preventDefault: vi.fn()
    };
    keydownListener(event);

    expect(blurMock).toHaveBeenCalled();
    expect(onEscapeMock).toHaveBeenCalled();
  });

  it('cancels key rebinding if Escape is pressed while rebinding', () => {
    let keydownListener: (e: any) => void = () => {};
    (global as any).window.addEventListener = vi.fn((event, handler) => {
      if (event === 'keydown') keydownListener = handler;
    });

    const testInput = new InputManager(settings as any);
    testInput.startRebinding('attack');
    expect(testInput.rebindingAction).toBe('attack');

    const event = {
      code: 'Escape',
      key: 'Escape',
      repeat: false,
      preventDefault: vi.fn()
    };
    keydownListener(event);

    expect(testInput.rebindingAction).toBeNull();
  });

  it('falls back to onAimCancel or onExitLook if onEscape is not registered', () => {
    let keydownListener: (e: any) => void = () => {};
    (global as any).window.addEventListener = vi.fn((event, handler) => {
      if (event === 'keydown') keydownListener = handler;
    });

    const testInput = new InputManager(settings as any);
    const onAimCancelMock = vi.fn();
    testInput.isAiming = true;
    testInput.onAimCancel = onAimCancelMock;

    const event = {
      code: 'Escape',
      key: 'Escape',
      repeat: false,
      preventDefault: vi.fn()
    };
    keydownListener(event);

    expect(onAimCancelMock).toHaveBeenCalled();
  });

  it('simulates modal closing hierarchy in ClientApp handleEscape logic', () => {
    // Model the ClientApp handleEscape state machine
    const state = {
      interactionModalOpen: false,
      settingsModalOpen: false,
      worldMapOpen: false,
      charSheetOpen: false,
      inventoryOpen: false,
      dialogueModalOpen: false,
      isAiming: false,
      isLooking: false
    };

    function handleEscape(): boolean {
      if (state.interactionModalOpen) {
        state.interactionModalOpen = false;
        return true;
      }
      if (state.settingsModalOpen) {
        state.settingsModalOpen = false;
        return true;
      }
      if (state.worldMapOpen) {
        state.worldMapOpen = false;
        return true;
      }
      if (state.charSheetOpen) {
        state.charSheetOpen = false;
        return true;
      }
      if (state.inventoryOpen) {
        state.inventoryOpen = false;
        return true;
      }
      if (state.dialogueModalOpen) {
        state.dialogueModalOpen = false;
        return true;
      }
      if (state.isAiming) {
        state.isAiming = false;
        return true;
      }
      if (state.isLooking) {
        state.isLooking = false;
        return true;
      }
      return false;
    }

    // 1. World Map open -> Esc closes map
    state.worldMapOpen = true;
    expect(handleEscape()).toBe(true);
    expect(state.worldMapOpen).toBe(false);

    // 2. Character Sheet open -> Esc closes character sheet
    state.charSheetOpen = true;
    expect(handleEscape()).toBe(true);
    expect(state.charSheetOpen).toBe(false);

    // 3. Inventory open -> Esc closes inventory
    state.inventoryOpen = true;
    expect(handleEscape()).toBe(true);
    expect(state.inventoryOpen).toBe(false);

    // 4. Look mode active -> Esc exits look mode
    state.isLooking = true;
    expect(handleEscape()).toBe(true);
    expect(state.isLooking).toBe(false);

    // 5. Look mode with interaction menu open -> Esc closes interaction menu first, then exits look mode
    state.isLooking = true;
    state.interactionModalOpen = true;
    expect(handleEscape()).toBe(true);
    expect(state.interactionModalOpen).toBe(false);
    expect(state.isLooking).toBe(true);
    expect(handleEscape()).toBe(true);
    expect(state.isLooking).toBe(false);

    // 6. Aiming mode active -> Esc cancels aiming
    state.isAiming = true;
    expect(handleEscape()).toBe(true);
    expect(state.isAiming).toBe(false);

    // 7. No window open -> returns false
    expect(handleEscape()).toBe(false);
  });
});
