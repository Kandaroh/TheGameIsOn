import { promises as fs } from 'fs';
import path from 'path';
import { Companion } from '../models/companion';

export class CompanionService {
  private readonly path = path.resolve(__dirname, '../../backend-data/companions.json');
  private cache: Companion[] | null = null;

  async getAll(): Promise<Companion[]> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const raw = await fs.readFile(this.path, 'utf8');
      const parsed = JSON.parse(raw) as Companion[];
      this.cache = parsed;
      return parsed;
    } catch {
      const backup = this.defaultCompanions();
      this.cache = backup;
      return backup;
    }
  }

  private defaultCompanions(): Companion[] {
    return [
      {
        id: 'wyvern',
        name: 'Wyvern',
        type: 'attack',
        life: 26,
        energy: 3,
        energyRefill: 1,
        priceDecks: {
          common: [
            { id: 'wyvern-claw', name: 'Wyvern Claw', cost: 1, type: 'attack', properties: { damage: 3 } },
            { id: 'wyvern-fly', name: 'Winged Leap', cost: 1, type: 'utility', properties: { evade: 1 } }
          ],
          uncommon: [
            { id: 'wyvern-breath', name: 'Flame Breath', cost: 2, type: 'attack', properties: { damage: 6 } }
          ],
          rare: [
            { id: 'wyvern-ember', name: 'Ember Storm', cost: 3, type: 'attack', properties: { damage: 10 } }
          ]
        }
      },
      {
        id: 'golem',
        name: 'Golem',
        type: 'defense',
        life: 28,
        energy: 2,
        energyRefill: 1,
        priceDecks: {
          common: [
            { id: 'golem-block', name: 'Rock Block', cost: 1, type: 'defense', properties: { block: 4 } },
            { id: 'golem-rumble', name: 'Ground Rumble', cost: 1, type: 'utility', properties: { taunt: true } }
          ],
          uncommon: [
            { id: 'golem-guard', name: 'Iron Guard', cost: 2, type: 'defense', properties: { block: 8 } }
          ],
          rare: [
            { id: 'golem-quake', name: 'Earthquake', cost: 3, type: 'utility', properties: { stun: true } }
          ]
        }
      },
      {
        id: 'sprite',
        name: 'Sprite',
        type: 'utility',
        life: 20,
        energy: 4,
        energyRefill: 2,
        priceDecks: {
          common: [
            { id: 'sprite-dash', name: 'Quick Dash', cost: 1, type: 'utility', properties: { move: 1 } },
            { id: 'sprite-gale', name: 'Breeze', cost: 1, type: 'utility', properties: { draw: 1 } }
          ],
          uncommon: [
            { id: 'sprite-splash', name: 'Aqua Puff', cost: 2, type: 'defense', properties: { shield: 5 } }
          ],
          rare: [
            { id: 'sprite-starlight', name: 'Starlight', cost: 3, type: 'utility', properties: { heal: 4 } }
          ]
        }
      },
      {
        id: 'lich',
        name: 'Lich',
        type: 'attack',
        life: 22,
        energy: 3,
        energyRefill: 1,
        priceDecks: {
          common: [
            { id: 'lich-bolt', name: 'Soul Bolt', cost: 1, type: 'attack', properties: { damage: 3 } },
            { id: 'lich-wisp', name: 'Wisp', cost: 1, type: 'utility', properties: { weaken: true } }
          ],
          uncommon: [
            { id: 'lich-chain', name: 'Chain Curse', cost: 2, type: 'attack', properties: { damage: 5 } }
          ],
          rare: [
            { id: 'lich-veil', name: 'Death Veil', cost: 3, type: 'defense', properties: { block: 7 } }
          ]
        }
      },
      {
        id: 'turtle',
        name: 'Turtle',
        type: 'defense',
        life: 24,
        energy: 2,
        energyRefill: 1,
        priceDecks: {
          common: [
            { id: 'turtle-shell', name: 'Shell Bash', cost: 1, type: 'defense', properties: { block: 4 } },
            { id: 'turtle-lash', name: 'Tail Lash', cost: 1, type: 'attack', properties: { damage: 2 } }
          ],
          uncommon: [
            { id: 'turtle-wave', name: 'Tidal Wave', cost: 2, type: 'utility', properties: { slow: true } }
          ],
          rare: [
            { id: 'turtle-fortress', name: 'Fortress', cost: 3, type: 'defense', properties: { block: 10 } }
          ]
        }
      },
      {
        id: 'griffin',
        name: 'Griffin',
        type: 'utility',
        life: 23,
        energy: 3,
        energyRefill: 2,
        priceDecks: {
          common: [
            { id: 'griffin-glide', name: 'Sky Glide', cost: 1, type: 'utility', properties: { evade: 1 } },
            { id: 'griffin-screech', name: 'Screech', cost: 1, type: 'utility', properties: { debuff: true } }
          ],
          uncommon: [
            { id: 'griffin-strike', name: 'Aerial Strike', cost: 2, type: 'attack', properties: { damage: 5 } }
          ],
          rare: [
            { id: 'griffin-gale', name: 'Gale Force', cost: 3, type: 'utility', properties: { draw: 2 } }
          ]
        }
      }
    ];
  }
}
