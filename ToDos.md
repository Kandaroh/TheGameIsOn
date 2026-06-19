- Make cards bigger so that the effect description is more readable

- Build the service to handle cards effect. The service should be called everytime a card is played. depending on the effects and the targets seletcted (monster the uses the card + target of the playeable card ) it should return to the frontend the new state of the game. (enemy hp, companions hp, companions hp and so on). 

- enemies should be treted as companion, enche with a persistent part where is is indicated name, type, element, possible moves with percentage of selecting, percentage of spawning, special abilities, area of spawning, level, exp gained, prices. The concept of area of psawening,  special abilities, level and prices are not yet used but they will in the future.
- possible attaks for enemies behave like cards with a type an element and a target.
- At the end of the turn the enemies will attak. For each enemy one of the attaks is selected, a possible target is selected (if none nothing happens) abd effect applied. All of this should be handled by the backed and the frontend should only manage graphical part and call backend with APIs


- companions should have a level and special abilites. When a combat is finished prices for monster are collected. for now prices are player gold, exp to split between the three companions, and draw cards from one of the prices deck of a companion. The companion that will draw card from the indicated price deck is the one that gave the fatal blow to that enemy. 

- The level of the companions and enemies is used to understand whioch special abilities are unlocked and thus active. 
- special abilities can be passive or activable a number of time per combat






ROLE: esperto in prompt engineering e prompt otmization

Ho scritto un todo sulle cose che devo fare per un mio gioco di carte. Vorrei mettessi in ordine i miei appunti. 

Rendi gli appunti più chiari per un llm agent. Otimizza l'utilizzo di token senza perdere informazione. 
Vorrei usare questi appunti per dare delle linee guida al mio agente. Ho bisogno di spendere pochi token. 


- Make cards bigger so that the effect description is more readable

- Build the service to handle cards effect. The service should be called everytime a card is played. depending on the effects and the targets seletcted (monster the uses the card + target of the playeable card ) it should return to the frontend the new state of the game. (enemy hp, companions hp, companions hp and so on). 

- enemies should be treted as companion, enche with a persistent part where is is indicated name, type, element, possible moves with percentage of selecting, percentage of spawning, special abilities, area of spawning, level, exp gained, prices. The concept of area of psawening,  special abilities, level and prices are not yet used but they will in the future.
- possible attaks for enemies behave like cards with a type an element and a target.
- At the end of the turn the enemies will attak. For each enemy one of the attaks is selected, a possible target is selected (if none nothing happens) abd effect applied. All of this should be handled by the backed and the frontend should only manage graphical part and call backend with APIs


- companions should have a level and special abilites. When a combat is finished prices for monster are collected. for now prices are player gold, exp to split between the three companions, and draw cards from one of the prices deck of a companion. The companion that will draw card from the indicated price deck is the one that gave the fatal blow to that enemy. 

- The level of the companions and enemies is used to understand whioch special abilities are unlocked and thus active. 
- special abilities can be passive or activable a number of time per combat

Se l'obiettivo è usarli come system prompt / agent guidelines, conviene eliminare ridondanze, standardizzare il vocabolario e trasformare gli appunti in requisiti operativi.

Versione ottimizzata per minimizzare i token mantenendo tutte le informazioni:

UI
- Increase card size to improve effect text readability.

Combat Engine
- Create a CardEffectService.
- Trigger it whenever a card is played.
- Inputs:
  - source (companion/enemy playing the card)
  - targets
  - card/effect data
  - current game state
- Output:
  - updated game state only (HP, statuses, resources, etc.).
- Frontend must never resolve effects; it only renders state and calls APIs.

Entities

Companions
- Add Properties:
  - level
  - specialAbilities
- Special abilities:
  - passive OR activable
  - activable abilities have a per-combat usage limit.
- Level determines which abilities are unlocked.

Enemies
- Use the same base model as companions.
- Persistent fields:
  - name
  - type
  - element
  - attacks
  - attackSelectionChance
  - spawnChance
  - specialAbilities
  - spawnArea
  - level
  - expReward
  - rewards
- spawnArea, specialAbilities, level and rewards are future-proof fields (not fully used yet).
- Level determines which abilities are unlocked.

Enemy Attacks
- Behave like cards.
- Properties:
  - type
  - element
  - targeting rules
  - effects

Turn Resolution
- At end of player turn, backend resolves enemy actions.
- For each enemy:
  1. Select attack based on attackSelectionChance.
  2. Select valid target.
  3. If no target exists, skip action.
  4. Apply effects.
- Frontend only displays results.

Combat Rewards
- When combat ends, collect rewards from defeated enemies.
- Current reward types:
  - gold
  - exp
  - companion reward-deck card draw
- EXP is split among the 3 companions.
- Reward-deck draw goes to the companion that dealt the killing blow.
- each enemy will give it's own prices


Post-Combat Flow
- After combat, show a Final Fantasy-style results screen.
- Layout:
  - left: 3 companions
  - right: rewards earned
- Use progress bars where appropriate (EXP, level progression, etc.).
- Continue flow:
  1. Results screen
  2. Player presses Continue
  3. Reward card selection screen (if applicable)
  4. Return to map





