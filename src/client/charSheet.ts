import { Entity, Attributes, SkillDefinition } from '../shared/types';
import { SKILL_DEFINITIONS } from '../shared/constants';
import { calculateHeroDerivedStats, calculateSkillCooldown } from '../shared/formulas';

export class CharacterSheetManager {
  private modalEl: HTMLElement;
  private currentEntity: Entity | null = null;
  public onAllocateAttribute?: (attribute: keyof Attributes) => void;
  public onUnlockSkill?: (skillId: string) => void;
  public onActivateSkill?: (skillId: string) => void;

  constructor() {
    this.modalEl = document.getElementById('charsheet-modal')!;
    this.initEvents();
  }

  private initEvents() {
    const closeBtn = document.getElementById('close-charsheet-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    const doneBtn = document.getElementById('charsheet-done-btn');
    doneBtn?.addEventListener('click', () => this.hide());

    // Close on overlay click outside card
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.hide();
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Escape' || e.code === 'Escape') && this.isOpen()) {
        e.preventDefault();
        this.hide();
      }
    });
  }

  public show() {
    this.modalEl.classList.remove('hidden');
    this.render();
  }

  public hide() {
    this.modalEl.classList.add('hidden');
  }

  public toggle() {
    if (this.modalEl.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }

  public isOpen(): boolean {
    return !this.modalEl.classList.contains('hidden');
  }

  public updateEntity(entity: Entity) {
    this.currentEntity = entity;
    if (this.isOpen()) {
      this.render();
    }
  }

  public render() {
    if (!this.currentEntity) return;
    const hero = this.currentEntity;
    const derivedStats = calculateHeroDerivedStats(hero);

    // Header info
    const nameEl = document.getElementById('charsheet-hero-name');
    if (nameEl) nameEl.textContent = `${hero.name} (The ${hero.role?.toUpperCase() || 'HERO'})`;

    const levelBadge = document.getElementById('charsheet-level-badge');
    if (levelBadge) levelBadge.textContent = `LEVEL ${hero.level || 1}`;

    const xpEl = document.getElementById('charsheet-xp-text');
    if (xpEl) xpEl.textContent = `XP: ${hero.xp || 0} / ${hero.nextLevelXp || 100}`;

    const xpBar = document.getElementById('charsheet-xp-fill') as HTMLElement;
    if (xpBar) {
      const pct = Math.min(100, Math.floor(((hero.xp || 0) / (hero.nextLevelXp || 100)) * 100));
      xpBar.style.width = `${pct}%`;
    }

    const apPointsEl = document.getElementById('charsheet-ap-points');
    if (apPointsEl) {
      const ap = hero.attributePoints || 0;
      apPointsEl.textContent = `${ap} Point${ap !== 1 ? 's' : ''} Available`;
      apPointsEl.style.color = ap > 0 ? 'var(--boss-gold)' : '#778899';
    }

    const spPointsEl = document.getElementById('charsheet-sp-points');
    if (spPointsEl) {
      const sp = hero.skillPoints || 0;
      spPointsEl.textContent = `${sp} Point${sp !== 1 ? 's' : ''} Available`;
      spPointsEl.style.color = sp > 0 ? 'var(--cyan)' : '#778899';
    }

    // Attributes list
    const attrsContainer = document.getElementById('charsheet-attributes-list');
    if (attrsContainer && hero.attributes) {
      attrsContainer.innerHTML = '';
      const attrNames: { key: keyof Attributes; label: string; desc: string; bonusText: string }[] = [
        { key: 'str', label: 'STR (Strength)', desc: 'Increases melee damage (+2/pt) and carry capacity (+8 lbs/pt).', bonusText: `+${derivedStats.meleeAtkBonus} ATK • ${derivedStats.maxCarryWeight} lbs Cap` },
        { key: 'agi', label: 'AGI (Agility)', desc: 'Increases dodge chance (+2%/pt) and ranged weapon damage.', bonusText: `${derivedStats.dodgeChance}% Dodge • +${derivedStats.rangedAtkBonus} Ranged` },
        { key: 'tou', label: 'TOU (Toughness)', desc: 'Increases max health (+12 HP/pt) and physical damage reduction.', bonusText: `+${derivedStats.touHpBonus} HP • -${derivedStats.flatDamageReduction} Dmg/Hit` },
        { key: 'int', label: 'INT (Intelligence)', desc: 'Increases energy pool (+10 EN/pt) and cooldown reduction (+2.5%/pt).', bonusText: `+${derivedStats.intEnergyBonus} EN • -${derivedStats.cooldownReductionPct}% CD` },
        { key: 'wil', label: 'WIL (Willpower)', desc: 'Increases force shield capacity (+15 Shield/pt) and energy recovery.', bonusText: `+${derivedStats.wilShieldBonus} Shield Cap` },
        { key: 'ego', label: 'EGO (Ego / Presence)', desc: 'Enhances companion damage resonance and team revival effectiveness.', bonusText: `+${derivedStats.partyEgoBonus}% Companion Aura` },
      ];

      const availableAp = hero.attributePoints || 0;

      for (const a of attrNames) {
        const val = hero.attributes[a.key] || 10;
        const row = document.createElement('div');
        row.className = 'charsheet-attr-row';
        row.innerHTML = `
          <div class="charsheet-attr-left">
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span class="charsheet-attr-name">${a.label}</span>
              <span style="font-size: 10px; color: var(--amber-bright);">${a.bonusText}</span>
            </div>
            <span class="charsheet-attr-desc">${a.desc}</span>
          </div>
          <div class="charsheet-attr-right">
            <span class="charsheet-attr-val">${val}</span>
            <button class="charsheet-attr-plus-btn" ${availableAp <= 0 ? 'disabled' : ''} title="Increase ${a.label} by 1">[+]</button>
          </div>
        `;

        const btn = row.querySelector('.charsheet-attr-plus-btn');
        btn?.addEventListener('click', () => {
          if (hero.attributePoints && hero.attributePoints > 0 && hero.attributes) {
            hero.attributePoints--;
            hero.attributes[a.key]++;
            this.render();
          }
          this.onAllocateAttribute?.(a.key);
        });

        attrsContainer.appendChild(row);
      }
    }

    // Derived Combat Stats
    const derivedContainer = document.getElementById('charsheet-derived-stats');
    if (derivedContainer) {
      derivedContainer.innerHTML = `
        <div class="derived-stat-box">
          <span class="derived-stat-label">Max Health (HP)</span>
          <span class="derived-stat-val">❤️ ${derivedStats.hp} / ${derivedStats.maxHp}</span>
          <span class="derived-stat-sub">+${derivedStats.touHpBonus} from TOU (+${derivedStats.levelHpBonus} lvl)</span>
        </div>
        <div class="derived-stat-box">
          <span class="derived-stat-label">Energy Pool (EN)</span>
          <span class="derived-stat-val">⚡ ${derivedStats.energy} / ${derivedStats.maxEnergy}</span>
          <span class="derived-stat-sub">+${derivedStats.intEnergyBonus} from INT</span>
        </div>
        <div class="derived-stat-box">
          <span class="derived-stat-label">Cooldown Reduction</span>
          <span class="derived-stat-val">⏳ ${derivedStats.cooldownReductionPct >= 0 ? `-${derivedStats.cooldownReductionPct}%` : `+${Math.abs(derivedStats.cooldownReductionPct)}%`} CDR</span>
          <span class="derived-stat-sub">Scales with INT (Base: 10)</span>
        </div>
        <div class="derived-stat-box">
          <span class="derived-stat-label">Force Shield</span>
          <span class="derived-stat-val">🛡️ ${derivedStats.shieldHp} / ${derivedStats.shieldCap}</span>
          <span class="derived-stat-sub">+${derivedStats.wilShieldBonus} from WIL</span>
        </div>
        <div class="derived-stat-box">
          <span class="derived-stat-label">Melee Attack Power</span>
          <span class="derived-stat-val">⚔️ +${derivedStats.meleeAtkBonus} ATK</span>
          <span class="derived-stat-sub">Scales with STR</span>
        </div>
        <div class="derived-stat-box">
          <span class="derived-stat-label">Ranged Laser Power</span>
          <span class="derived-stat-val">🎯 +${derivedStats.rangedAtkBonus} ATK</span>
          <span class="derived-stat-sub">Scales with AGI</span>
        </div>
        <div class="derived-stat-box">
          <span class="derived-stat-label">Dodge & Evasion</span>
          <span class="derived-stat-val">💨 ${derivedStats.dodgeChance}%</span>
          <span class="derived-stat-sub">Scales with AGI</span>
        </div>
        <div class="derived-stat-box">
          <span class="derived-stat-label">Damage Mitigation</span>
          <span class="derived-stat-val">🛡️ -${derivedStats.flatDamageReduction} / ${derivedStats.armorPercent}%</span>
          <span class="derived-stat-sub">TOU Flat + Armor %</span>
        </div>
        <div class="derived-stat-box">
          <span class="derived-stat-label">Max Carry Capacity</span>
          <span class="derived-stat-val">🎒 ${derivedStats.maxCarryWeight} lbs</span>
          <span class="derived-stat-sub">30 + STR * 8 lbs</span>
        </div>
      `;
    }

    // Skills list
    const skillsContainer = document.getElementById('charsheet-skills-list');
    if (skillsContainer) {
      skillsContainer.innerHTML = '';
      const learned = hero.skillsLearned || [];
      const availableSp = hero.skillPoints || 0;

      const categories = [
        { cat: 'wayfaring', title: '🧭 WAYFARING & EXPLORATION' },
        { cat: 'combat', title: '⚔️ COMBAT & DEFENSE' },
        { cat: 'marksmanship', title: '⚡ MARKSMANSHIP & TECH' },
        { cat: 'powers', title: '❄️ ESOTERIC POWERS' },
      ];

      for (const c of categories) {
        const catSkills = SKILL_DEFINITIONS.filter(s => s.category === c.cat);
        if (catSkills.length === 0) continue;

        const catHeader = document.createElement('div');
        catHeader.className = 'charsheet-skill-category-header';
        catHeader.textContent = c.title;
        skillsContainer.appendChild(catHeader);

        for (const skill of catSkills) {
          const isLearned = learned.includes(skill.id);
          const canAfford = availableSp >= skill.spCost;
          const isActive = skill.type === 'active';
          const cd = hero.skillCooldowns?.[skill.id] || 0;
          const hasEnergy = hero.energy >= (skill.energyCost || 0);

          const card = document.createElement('div');
          card.className = `charsheet-skill-card ${isLearned ? 'learned' : ''} ${isActive ? 'active-skill' : 'passive-skill'}`;

          const baseCd = skill.cooldownTicks || 35;
          const effectiveCd = calculateSkillCooldown(baseCd, hero.attributes?.int || 10);
          const reductionTurns = baseCd - effectiveCd;
          const reductionText = reductionTurns > 0 ? ` (-${reductionTurns} INT)` : (reductionTurns < 0 ? ` (+${Math.abs(reductionTurns)} INT)` : '');

          const typeBadge = isActive
            ? `<span class="skill-type-tag active">⚡ ACTIVE (${skill.energyCost || 20} EN • ${effectiveCd} turns CD${reductionText})</span>`
            : `<span class="skill-type-tag passive">🛡️ PASSIVE PERK</span>`;

          card.innerHTML = `
            <div class="charsheet-skill-header">
              <span class="charsheet-skill-icon">${skill.icon}</span>
              <div style="flex: 1;">
                <div class="charsheet-skill-title">${skill.name}</div>
                ${typeBadge}
              </div>
              <span class="charsheet-skill-cost">${isLearned ? '✓ LEARNED' : `${skill.spCost} SP`}</span>
            </div>
            <div class="charsheet-skill-desc">${skill.description}</div>
            <div class="charsheet-skill-action">
              ${isLearned
                ? (isActive
                    ? `<button class="charsheet-cast-btn" ${cd > 0 || !hasEnergy ? 'disabled' : ''}>${cd > 0 ? `⏳ Cooldown (${cd} turns)` : (!hasEnergy ? '⚡ Need Energy' : '▶ Cast / Activate')}</button>`
                    : `<span class="charsheet-skill-badge-learned">★ Passive Mastery Active</span>`)
                : `<button class="charsheet-learn-btn" ${!canAfford ? 'disabled' : ''}>[Learn (${skill.spCost} SP)]</button>`}
            </div>
          `;

          if (!isLearned) {
            const learnBtn = card.querySelector('.charsheet-learn-btn');
            learnBtn?.addEventListener('click', () => {
              this.onUnlockSkill?.(skill.id);
            });
          } else if (isActive) {
            const castBtn = card.querySelector('.charsheet-cast-btn');
            castBtn?.addEventListener('click', () => {
              this.onActivateSkill?.(skill.id);
            });
          }

          skillsContainer.appendChild(card);
        }
      }
    }
  }
}
