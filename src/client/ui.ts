import { SettingsManager } from './settings';
import { HeroRole, DialogueBox, CombatLogEntry, PacingMode, KeyMappingConfig } from '../shared/types';
import { COLORS } from '../shared/constants';

export class UIManager {
  private settings: SettingsManager;

  // DOM Elements
  private locationEl: HTMLElement;
  private pacingEl: HTMLElement;
  private questTitleEl: HTMLElement;
  private questDescEl: HTMLElement;
  private partyContainerEl: HTMLElement;
  private combatLogEl: HTMLElement;
  private dialogueModalEl: HTMLElement;
  private settingsModalEl: HTMLElement;
  private downedBannerEl: HTMLElement | null;

  // Look Mode Elements
  private lookCardEl: HTMLElement;
  private lookTitleEl: HTMLElement;
  private lookCoordsEl: HTMLElement;
  private lookCategoryEl: HTMLElement;
  private lookDescEl: HTMLElement;
  private lookDetailEl: HTMLElement;

  // Interaction Modal Elements
  private interactionModalEl: HTMLElement;
  private interactionTargetTitleEl: HTMLElement;
  private interactionTargetDescEl: HTMLElement;
  private interactionOptionsListEl: HTMLElement;

  public onTickRateChanged?: (newRate: number) => void;
  public onRebindRequested?: (action: keyof KeyMappingConfig) => void;
  public onActionTriggered?: (action: string) => void;
  public onToggleLookRequested?: () => void;
  public onCancelInteractionRequested?: () => void;

  constructor(settings: SettingsManager) {
    this.settings = settings;

    this.locationEl = document.getElementById('hud-location')!;
    this.pacingEl = document.getElementById('hud-pacing')!;
    this.questTitleEl = document.getElementById('hud-quest-title')!;
    this.questDescEl = document.getElementById('hud-quest-desc')!;
    this.partyContainerEl = document.getElementById('hud-party')!;
    this.combatLogEl = document.getElementById('combat-log-content')!;
    this.dialogueModalEl = document.getElementById('dialogue-modal')!;
    this.settingsModalEl = document.getElementById('settings-modal')!;
    this.downedBannerEl = document.getElementById('downed-banner');

    this.lookCardEl = document.getElementById('look-info-card')!;
    this.lookTitleEl = document.getElementById('look-title')!;
    this.lookCoordsEl = document.getElementById('look-coords')!;
    this.lookCategoryEl = document.getElementById('look-category')!;
    this.lookDescEl = document.getElementById('look-desc')!;
    this.lookDetailEl = document.getElementById('look-detail')!;

    this.interactionModalEl = document.getElementById('interaction-modal')!;
    this.interactionTargetTitleEl = document.getElementById('interaction-target-title')!;
    this.interactionTargetDescEl = document.getElementById('interaction-target-desc')!;
    this.interactionOptionsListEl = document.getElementById('interaction-options-list')!;

    this.setupButtonListeners();
  }

  private setupButtonListeners() {
    // Action bar buttons
    document.getElementById('btn-attack')?.addEventListener('click', () => this.onActionTriggered?.('attack'));
    document.getElementById('btn-special')?.addEventListener('click', () => this.onActionTriggered?.('special'));
    document.getElementById('btn-mine')?.addEventListener('click', () => this.onActionTriggered?.('mine'));
    document.getElementById('btn-craft')?.addEventListener('click', () => this.onActionTriggered?.('craft'));
    document.getElementById('btn-revive')?.addEventListener('click', () => this.onActionTriggered?.('revive'));
    document.getElementById('btn-look')?.addEventListener('click', () => this.onToggleLookRequested?.());
    document.getElementById('btn-settings')?.addEventListener('click', () => this.toggleSettingsModal(true));
    document.getElementById('close-settings-btn')?.addEventListener('click', () => this.toggleSettingsModal(false));
    document.getElementById('interaction-cancel-btn')?.addEventListener('click', () => {
      this.hideInteractionModal();
      this.onCancelInteractionRequested?.();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.settingsModalEl.classList.contains('hidden')) {
        this.toggleSettingsModal(false);
      }
    });

    // Reset default keys
    document.getElementById('btn-reset-keys')?.addEventListener('click', () => {
      this.settings.resetDefaults();
      this.renderKeybindingList();
    });

    // Tick rate slider
    const slider = document.getElementById('tick-rate-slider') as HTMLInputElement;
    const rateVal = document.getElementById('tick-rate-val')!;
    if (slider) {
      slider.addEventListener('input', () => {
        const val = Number(slider.value);
        rateVal.textContent = `${val} Hz (${Math.round(1000 / val)}ms)`;
        this.onTickRateChanged?.(val);
      });
    }

    // Firebase SSO button
    document.getElementById('btn-firebase-sso')?.addEventListener('click', async () => {
      const ssoStatus = document.getElementById('sso-status')!;
      ssoStatus.textContent = 'Authenticating with Google / Firebase...';
      try {
        const success = await this.settings.initFirebaseSSO();
        if (success && this.settings.userEmail) {
          ssoStatus.textContent = `Signed in as: ${this.settings.userEmail} (Synced)`;
        } else {
          ssoStatus.textContent = 'Firebase credentials not configured. Using browser LocalStorage.';
        }
      } catch (err: any) {
        ssoStatus.textContent = `SSO Notice: ${err.message || 'Using LocalStorage'}`;
      }
    });
  }

  public updateHeader(locationName: string, pacingMode: PacingMode, tickRate: number) {
    this.locationEl.textContent = locationName.replace(/\s*\[Parsec[^\]]+\]/g, '').trim();
    if (pacingMode === 'real_time') {
      this.pacingEl.textContent = `[REAL-TIME: ${tickRate} Hz]`;
      this.pacingEl.className = 'pacing-realtime';
    } else {
      this.pacingEl.textContent = `[TURN-BASED (Waiting for Your Move)]`;
      this.pacingEl.className = 'pacing-turnbased';
    }
  }

  public updateQuest(title: string, desc: string) {
    this.questTitleEl.textContent = title;
    this.questDescEl.textContent = desc;
  }

  public updateParty(members: { role: HeroRole; name: string; hp: number; maxHp: number; isDowned: boolean; isBot: boolean }[]) {
    this.partyContainerEl.innerHTML = '';
    for (const m of members) {
      const isActuallyDowned = !!(m.isDowned && m.hp <= 0);
      const card = document.createElement('div');
      card.className = `party-card ${isActuallyDowned ? 'downed' : ''}`;

      const name = document.createElement('div');
      name.className = 'party-name';
      name.textContent = `${m.name} ${m.isBot ? '(AI)' : '(Player)'}`;

      const barContainer = document.createElement('div');
      barContainer.className = 'hp-bar-bg';

      const barFill = document.createElement('div');
      barFill.className = `hp-bar-fill ${m.role}`;
      barFill.style.width = `${Math.max(0, Math.min(100, (m.hp / m.maxHp) * 100))}%`;

      barContainer.appendChild(barFill);

      const hpTxt = document.createElement('div');
      hpTxt.className = 'party-hp-text';
      hpTxt.textContent = isActuallyDowned ? 'DOWNED!' : `${m.hp}/${m.maxHp} HP`;

      card.appendChild(name);
      card.appendChild(barContainer);
      card.appendChild(hpTxt);
      this.partyContainerEl.appendChild(card);
    }
  }

  public setDownedBanner(isDowned: boolean) {
    if (!this.downedBannerEl) return;
    if (isDowned) {
      this.downedBannerEl.classList.remove('hidden');
    } else {
      this.downedBannerEl.classList.add('hidden');
    }
  }

  public addLogEntry(entry: CombatLogEntry) {
    const p = document.createElement('p');
    p.className = `log-entry ${entry.category}`;
    p.textContent = `> ${entry.text}`;
    p.style.color = entry.color;
    this.combatLogEl.appendChild(p);
    this.combatLogEl.scrollTop = this.combatLogEl.scrollHeight;
  }

  public showDialogue(dialogue: DialogueBox) {
    const speakerEl = document.getElementById('dialogue-speaker')!;
    const textEl = document.getElementById('dialogue-text')!;
    const avatarEl = document.getElementById('dialogue-avatar')!;

    speakerEl.textContent = dialogue.speaker;
    textEl.textContent = dialogue.text;
    avatarEl.textContent = dialogue.avatarSymbol;
    avatarEl.style.color = dialogue.avatarColor;

    this.dialogueModalEl.classList.remove('hidden');

    const closeBtn = document.getElementById('dialogue-continue-btn')!;
    const onClose = (e?: Event) => {
      if (e) e.stopPropagation();
      this.dialogueModalEl.classList.add('hidden');
      closeBtn.removeEventListener('click', onClose);
      window.removeEventListener('keydown', onKey);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    closeBtn.addEventListener('click', onClose);
    window.addEventListener('keydown', onKey);
  }

  public toggleSettingsModal(open?: boolean) {
    const isHidden = this.settingsModalEl.classList.contains('hidden');
    const shouldOpen = open !== undefined ? open : isHidden;

    if (shouldOpen) {
      this.renderKeybindingList();
      this.settingsModalEl.classList.remove('hidden');
    } else {
      this.settingsModalEl.classList.add('hidden');
    }
  }

  public renderKeybindingList() {
    const container = document.getElementById('keybindings-list')!;
    container.innerHTML = '';

    const actions: { id: keyof KeyMappingConfig; label: string }[] = [
      { id: 'moveUp', label: 'Move Up' },
      { id: 'moveDown', label: 'Move Down' },
      { id: 'moveLeft', label: 'Move Left' },
      { id: 'moveRight', label: 'Move Right' },
      { id: 'waitTurn', label: 'Wait a Turn' },
      { id: 'attack', label: 'Attack / Laser (1)' },
      { id: 'specialAbility', label: 'Special: Ice / Fire / Heal (2)' },
      { id: 'mine', label: 'Mine Rock Wall (3)' },
      { id: 'craft', label: 'Craft / Altar Interact (4)' },
      { id: 'revive', label: 'Revive Downed Ally (R)' },
      { id: 'settings', label: 'Open Settings (O)' }
    ];

    for (const a of actions) {
      const row = document.createElement('div');
      row.className = 'keybind-row';

      const lbl = document.createElement('span');
      lbl.textContent = a.label;

      const btn = document.createElement('button');
      btn.className = 'keybind-btn';
      btn.textContent = this.settings.keyMappings[a.id] || 'None';

      btn.addEventListener('click', () => {
        btn.textContent = 'Press any key...';
        btn.classList.add('active-rebind');
        this.onRebindRequested?.(a.id);
      });

      row.appendChild(lbl);
      row.appendChild(btn);
      container.appendChild(row);
    }
  }

  public showLookCard(title: string, coords: string, category: string, desc: string, detail?: string, isHtml: boolean = false) {
    this.lookTitleEl.textContent = title;
    this.lookCoordsEl.textContent = coords;
    this.lookCategoryEl.textContent = category;
    if (isHtml) {
      this.lookDescEl.innerHTML = desc;
    } else {
      this.lookDescEl.textContent = desc;
    }
    this.lookDetailEl.textContent = detail || '';
    this.lookCardEl.classList.remove('hidden');
  }

  public hideLookCard() {
    this.lookCardEl.classList.add('hidden');
  }

  public showInteractionModal(
    title: string,
    desc: string,
    options: { id: string; label: string; shortcut?: string }[],
    onSelect: (id: string) => void
  ) {
    this.interactionTargetTitleEl.textContent = title;
    this.interactionTargetDescEl.textContent = desc;
    this.interactionOptionsListEl.innerHTML = '';

    for (const opt of options) {
      const btn = document.createElement('button');
      btn.className = 'interaction-btn';

      const labelSpan = document.createElement('span');
      labelSpan.textContent = opt.label;

      btn.appendChild(labelSpan);

      if (opt.shortcut) {
        const scSpan = document.createElement('span');
        scSpan.style.color = 'var(--cyan)';
        scSpan.style.fontSize = '11px';
        scSpan.textContent = `[${opt.shortcut}]`;
        btn.appendChild(scSpan);
      }

      btn.addEventListener('click', () => {
        this.hideInteractionModal();
        onSelect(opt.id);
      });

      this.interactionOptionsListEl.appendChild(btn);
    }

    this.interactionModalEl.classList.remove('hidden');
  }

  public hideInteractionModal() {
    this.interactionModalEl.classList.add('hidden');
  }
}
