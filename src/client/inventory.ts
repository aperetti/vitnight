import { Entity, Item, ItemSlot, ItemType } from '../shared/types';
import { COLORS } from '../shared/constants';
import { combineLikeItems } from '../shared/formulas';

export class InventoryManager {
  private modalEl: HTMLElement;
  private currentEntity: Entity | null = null;
  private groundItems: { x: number; y: number; item: Item }[] = [];
  private activeFilter: 'all' | 'equipment' | 'consumables' | 'materials' = 'all';

  public onEquipItem?: (itemId: string, slot: ItemSlot) => void;
  public onUnequipItem?: (slot: ItemSlot) => void;
  public onUseItem?: (itemId: string) => void;
  public onDropItem?: (itemId: string) => void;
  public onPickupItem?: (itemId?: string) => void;

  constructor() {
    this.modalEl = document.getElementById('inventory-modal')!;
    this.initEvents();
  }

  private initEvents() {
    document.getElementById('close-inventory-btn')?.addEventListener('click', () => this.hide());
    document.getElementById('inventory-done-btn')?.addEventListener('click', () => this.hide());

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.hide();
    });

    // Filter tabs
    const tabs: { id: string; filter: 'all' | 'equipment' | 'consumables' | 'materials' }[] = [
      { id: 'inv-tab-all', filter: 'all' },
      { id: 'inv-tab-equip', filter: 'equipment' },
      { id: 'inv-tab-consumables', filter: 'consumables' },
      { id: 'inv-tab-materials', filter: 'materials' }
    ];

    for (const t of tabs) {
      document.getElementById(t.id)?.addEventListener('click', () => {
        this.activeFilter = t.filter;
        for (const other of tabs) {
          document.getElementById(other.id)?.classList.toggle('active', other.id === t.id);
        }
        this.renderBackpack();
      });
    }
  }

  public show() {
    this.modalEl.classList.remove('hidden');
    this.render();
  }

  public hide() {
    this.modalEl.classList.add('hidden');
  }

  public toggle() {
    if (this.isOpen()) {
      this.hide();
    } else {
      this.show();
    }
  }

  public isOpen(): boolean {
    return !this.modalEl.classList.contains('hidden');
  }

  public update(entity: Entity, groundItems: { x: number; y: number; item: Item }[]) {
    this.currentEntity = entity;
    this.groundItems = groundItems;
    if (this.isOpen()) {
      this.render();
    }
  }

  public render() {
    if (!this.currentEntity) return;
    const hero = this.currentEntity;

    // Header Title & Hero summary
    const titleEl = document.getElementById('inventory-hero-title');
    if (titleEl) {
      titleEl.textContent = `${hero.name.toUpperCase()} — INVENTORY & EQUIPMENT`;
    }

    // Carrying Weight calculation
    let currentWeight = 0;
    for (const it of hero.inventory) {
      currentWeight += (it.weight || 0.5) * (it.count || 1);
    }
    if (hero.equipment) {
      for (const it of Object.values(hero.equipment)) {
        if (it) currentWeight += (it.weight || 0.5);
      }
    }
    currentWeight = Math.round(currentWeight * 10) / 10;
    const str = hero.attributes?.str || 14;
    const maxWeight = 30 + str * 8;

    const weightEl = document.getElementById('inventory-weight-text');
    if (weightEl) {
      weightEl.textContent = `Carrying: ${currentWeight.toFixed(1)} / ${maxWeight.toFixed(1)} lbs`;
      weightEl.style.color = currentWeight > maxWeight ? 'var(--fire-red)' : 'var(--cyan)';
    }

    const weightBar = document.getElementById('inventory-weight-fill');
    if (weightBar) {
      const pct = Math.min(100, Math.floor((currentWeight / maxWeight) * 100));
      weightBar.style.width = `${pct}%`;
      weightBar.style.backgroundColor = currentWeight > maxWeight ? 'var(--fire-red)' : 'var(--cyan)';
    }

    this.renderEquipment();
    this.renderBackpack();
    this.renderGroundItems();
  }

  private renderEquipment() {
    if (!this.currentEntity) return;
    const hero = this.currentEntity;
    const eq = hero.equipment || {};

    const slots: { slot: ItemSlot; label: string; icon: string; item?: Item }[] = [
      { slot: 'weapon', label: 'MAIN WEAPON', icon: '⚔️', item: eq.weapon },
      { slot: 'shield', label: 'OFF-HAND SHIELD', icon: '🛡️', item: eq.shield },
      { slot: 'head', label: 'HEADGEAR', icon: '🪖', item: eq.head },
      { slot: 'body', label: 'BODY ARMOR', icon: '🥋', item: eq.body },
      { slot: 'relic', label: 'RELIC / BAETYL', icon: '💍', item: eq.relic }
    ];

    const container = document.getElementById('inventory-paperdoll-list');
    if (!container) return;
    container.innerHTML = '';

    let totalAtk = 0;
    let totalDef = 0;
    let totalShield = 0;
    let totalHp = 0;
    let totalEnergy = 0;

    for (const s of slots) {
      const row = document.createElement('div');
      row.className = `paperdoll-slot-card ${s.item ? 'equipped' : 'empty'}`;

      if (s.item) {
        if (s.item.atkBonus) totalAtk += s.item.atkBonus;
        if (s.item.defenseBonus) totalDef += s.item.defenseBonus;
        if (s.item.shieldBonus) totalShield += s.item.shieldBonus;
        if (s.item.hpBonus) totalHp += s.item.hpBonus;
        if (s.item.energyBonus) totalEnergy += s.item.energyBonus;

        const rarityBadge = s.item.rarity ? `<span class="rarity-badge ${s.item.rarity}">${s.item.rarity.toUpperCase()}</span>` : '';
        const statTags = this.getItemStatTags(s.item);

        row.innerHTML = `
          <div class="slot-header">
            <span class="slot-label">${s.icon} ${s.label}</span>
            ${rarityBadge}
          </div>
          <div class="slot-item-body">
            <span class="slot-item-symbol" style="color: ${s.item.color}">${s.item.symbol}</span>
            <div class="slot-item-details">
              <div class="slot-item-name">${s.item.name}</div>
              <div class="slot-item-stats">${statTags} (${s.item.weight || 1} lbs)</div>
            </div>
            <button class="slot-unequip-btn">[Unequip]</button>
          </div>
        `;

        row.querySelector('.slot-unequip-btn')?.addEventListener('click', () => {
          this.onUnequipItem?.(s.slot);
        });
      } else {
        row.innerHTML = `
          <div class="slot-header">
            <span class="slot-label">${s.icon} ${s.label}</span>
          </div>
          <div class="slot-empty-body">
            <span class="slot-empty-text">[Empty Slot]</span>
          </div>
        `;
      }

      container.appendChild(row);
    }

    // Equipment Totals Breakdown
    const totalsEl = document.getElementById('inventory-gear-totals');
    if (totalsEl) {
      totalsEl.innerHTML = `
        <div class="gear-stat-pill"><span class="pill-label">ATK:</span> +${totalAtk}</div>
        <div class="gear-stat-pill"><span class="pill-label">DEF:</span> +${totalDef}%</div>
        <div class="gear-stat-pill"><span class="pill-label">SHIELD:</span> +${totalShield}</div>
        <div class="gear-stat-pill"><span class="pill-label">HP:</span> +${totalHp}</div>
        <div class="gear-stat-pill"><span class="pill-label">ENERGY:</span> +${totalEnergy}</div>
      `;
    }
  }

  private renderBackpack() {
    if (!this.currentEntity) return;
    const hero = this.currentEntity;
    const container = document.getElementById('inventory-backpack-items');
    if (!container) return;
    container.innerHTML = '';

    let items = combineLikeItems(hero.inventory);
    if (this.activeFilter === 'equipment') {
      items = items.filter(it => ['weapon', 'shield', 'head', 'body', 'relic'].includes(it.type) || it.slot !== undefined);
    } else if (this.activeFilter === 'consumables') {
      items = items.filter(it => it.type === 'consumable');
    } else if (this.activeFilter === 'materials') {
      items = items.filter(it => ['material', 'key', 'puzzle_piece', 'rune'].includes(it.type));
    }

    if (items.length === 0) {
      container.innerHTML = `<div class="inventory-empty-state">Backpack is empty in this category.</div>`;
      return;
    }

    for (const item of items) {
      const card = document.createElement('div');
      card.className = `inventory-item-card ${item.rarity || 'common'}`;

      const countBadge = (item.count && item.count > 1) ? `<span class="item-count-badge">x${item.count}</span>` : '';
      const rarityBadge = item.rarity ? `<span class="rarity-badge ${item.rarity}">${item.rarity.toUpperCase()}</span>` : '';
      const statTags = this.getItemStatTags(item);
      const isEquippable = ['weapon', 'shield', 'head', 'body', 'relic'].includes(item.type) || item.slot !== undefined;
      const isConsumable = item.type === 'consumable';

      card.innerHTML = `
        <div class="item-card-left">
          <div class="item-symbol-box" style="color: ${item.color}">${item.symbol}</div>
          <div class="item-text-group">
            <div class="item-title-row">
              <span class="item-name">${item.name}</span>
              ${countBadge}
              ${rarityBadge}
            </div>
            <div class="item-stats-row">${statTags} • <span style="color: #8899aa;">${item.weight || 0.5} lbs</span></div>
            <div class="item-desc-row">${item.description}</div>
          </div>
        </div>
        <div class="item-card-actions">
          ${isEquippable ? `<button class="inv-action-btn btn-equip" title="Equip to ${item.slot || item.type}">[Equip]</button>` : ''}
          ${isConsumable ? `<button class="inv-action-btn btn-use" title="Consume this item">[Use]</button>` : ''}
          <button class="inv-action-btn btn-drop" title="Drop onto ground tile">[Drop]</button>
        </div>
      `;

      if (isEquippable) {
        card.querySelector('.btn-equip')?.addEventListener('click', () => {
          const slot = (item.slot || item.type) as ItemSlot;
          this.onEquipItem?.(item.id, slot);
        });
      }

      if (isConsumable) {
        card.querySelector('.btn-use')?.addEventListener('click', () => {
          this.onUseItem?.(item.id);
        });
      }

      card.querySelector('.btn-drop')?.addEventListener('click', () => {
        this.onDropItem?.(item.id);
      });

      container.appendChild(card);
    }
  }

  private renderGroundItems() {
    if (!this.currentEntity) return;
    const hero = this.currentEntity;
    const container = document.getElementById('inventory-ground-items');
    if (!container) return;
    container.innerHTML = '';

    const underfoot = this.groundItems.filter(it => it.x === hero.x && it.y === hero.y);

    if (underfoot.length === 0) {
      container.innerHTML = `<div class="ground-empty-state">No items lying underfoot on tile (${hero.x}, ${hero.y}).</div>`;
      return;
    }

    const header = document.createElement('div');
    header.className = 'ground-header-row';
    header.innerHTML = `
      <span>ITEMS UNDERFOOT (${underfoot.length})</span>
      <button id="btn-pickup-all" class="inv-pickup-all-btn">[Pick Up All (G)]</button>
    `;
    container.appendChild(header);

    header.querySelector('#btn-pickup-all')?.addEventListener('click', () => {
      this.onPickupItem?.();
    });

    for (const entry of underfoot) {
      const it = entry.item;
      const row = document.createElement('div');
      row.className = 'ground-item-row';
      row.innerHTML = `
        <div class="ground-item-info">
          <span class="ground-item-symbol" style="color: ${it.color}">${it.symbol}</span>
          <span class="ground-item-name">${it.name} ${it.count && it.count > 1 ? `x${it.count}` : ''}</span>
          <span class="ground-item-weight">${it.weight || 0.5} lbs</span>
        </div>
        <button class="ground-pickup-btn">[Pick Up]</button>
      `;

      row.querySelector('.ground-pickup-btn')?.addEventListener('click', () => {
        this.onPickupItem?.(it.id);
      });

      container.appendChild(row);
    }
  }

  private getItemStatTags(item: Item): string {
    const tags: string[] = [];
    if (item.atkBonus) tags.push(`<span class="stat-tag atk">+${item.atkBonus} ATK</span>`);
    if (item.defenseBonus) tags.push(`<span class="stat-tag def">+${item.defenseBonus}% ARMOR</span>`);
    if (item.shieldBonus) tags.push(`<span class="stat-tag shield">+${item.shieldBonus} SHIELD</span>`);
    if (item.hpBonus) tags.push(`<span class="stat-tag hp">+${item.hpBonus} HP</span>`);
    if (item.energyBonus) tags.push(`<span class="stat-tag energy">+${item.energyBonus} EN</span>`);
    if (item.healHp) tags.push(`<span class="stat-tag heal">Restores ${item.healHp} HP</span>`);
    if (item.restoreEnergy) tags.push(`<span class="stat-tag energy">Restores ${item.restoreEnergy} EN</span>`);
    if (item.rechargeShield) tags.push(`<span class="stat-tag shield">Recharges ${item.rechargeShield} Shield</span>`);
    if (item.aoeDamage) tags.push(`<span class="stat-tag aoe">${item.aoeDamage} AoE Fire</span>`);
    if (item.aoeFreeze) tags.push(`<span class="stat-tag freeze">${item.aoeFreeze} Ticks Freeze</span>`);
    if (item.phaseTicks) tags.push(`<span class="stat-tag phase">Phase Walk (${item.phaseTicks} ticks)</span>`);
    if (item.miningTier !== undefined || item.miningPower !== undefined) {
      tags.push(`<span class="stat-tag mining" style="color: #ffb733; border: 1px solid #ffb733; padding: 1px 4px; border-radius: 2px;">TIER ${item.miningTier ?? 1} DIG (${item.miningPower ?? 25} PWR)</span>`);
    }
    return tags.join(' ');
  }
}
