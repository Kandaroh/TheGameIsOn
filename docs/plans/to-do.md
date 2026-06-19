- Better display cards information following this template


#Companion

|-------------------------------------------------------|
| Name                                          Type    |
|-------------------------------------------------------|
|                   COMPANION_TYPE                      |
|-------------------------------------------------------|
|                                                       |
|       Sprite                                          |
|                                                       |
|                                                       |
|-------------------------------------------------------|
| HP_icon - HP_BAR                                      |
| Energy _icon - energy dots                            |
| XP_icon - cp_bar                                      |   
|                                                       |
| energy_refill_icon - refill number                    |
|                                                       |
| Ability_1_name                                        |
|   Ability_1_description                               |
|                                                       |
| Ability_2_name                                        |
|   Ability_2_description                               |
|                                                       |
| Ability_3_name                                        |
|   Ability_3_description                               |
|-------------------------------------------------------|


#Enemy

|-------------------------------------------------------|
| Name                                          Type    |
|-------------------------------------------------------|
|                                                       |
|       Sprite                                          |
|                                                       |
|                                                       |
|-------------------------------------------------------|
| HP_icon - HP_BAR                                      |
|                                                       |
| XP_reward_icon - xp_reward                            |   
| other rewards                                         |
|                                                       |
|                                                       |
| Attack_1_name                                         |
|   Attack_1_description                                |
|                                                       |
| Attack_2_name                                         |
|   Attack_2_description                                |
|                                                       |
| Attack_3_name                                         |
|   Attack_3_description                                |
|-------------------------------------------------------|





|-------------------------------------------------------|
| Name                          Type               Cost |
|-------------------------------------------------------|
|                   CARD_TYPE                           |
|-------------------------------------------------------|
|                                                       |
|       Sprite                                          |
|                                                       |
|                                                       |
|-------------------------------------------------------|
| Nomral-effect                                         |
|                                                       |
| Boosted effect                                        |   
|                                                      |
|                                                       |
|                                                       |
| Attack_1_name                                         |
|   Attack_1_description                                |
|                                                       |
| Attack_2_name                                         |
|   Attack_2_description                                |
|                                                       |
| Attack_3_name                                         |
|   Attack_3_description                                |
|-------------------------------------------------------|

- Each companion will have three abilities that he unlock with levels. The ability will be unlocked with leveling up. 
    Leveling up will also increase health. Make a service in the backed that deal with leveling up. 
    When an ability is locked on a companion it won't show on the companion card

- lets add the status poison: poison will add stacks the more staks the more damage recieved. Poison is a status. 
    Status have a tirgger-moment varable that states when the status will trigger. This can be: in the moment it is applied, at the start of the turn, at thge end of the turn. Make the logic work so that add new moments in the future wil be easy. 
    all of this logic should be handled mainly by the backed. 
    When a wild monster or a companion is affected by a status a little icon will appear on right top corner. 
    


#Companion

|-------------------------------------------------------|----------|
| Name                                          Type    | status 1 |
|-------------------------------------------------------|----------|
|                   COMPANION_TYPE                      |
|-------------------------------------------------------|
|                                                       |
|       Sprite                                          |
|                                                       |
|                                                       |
|-------------------------------------------------------|
| HP_icon - HP_BAR                                      |
| Energy _icon - energy dots                            |
| XP_icon - cp_bar                                      |   
|                                                       |
| energy_refill_icon - refill number                    |
|                                                       |
| Ability_1_name                                        |
|   Ability_1_description                               |
|                                                       |
| Ability_2_name                                        |
|   Ability_2_description                               |
|                                                       |
| Ability_3_name                                        |
|   Ability_3_description                               |
|-------------------------------------------------------|


#Enemy

|-------------------------------------------------------|----------|
| Name                                          Type    | status 1 |
|-------------------------------------------------------|----------|
|                                                       | status 2 |
|       Sprite                                          |----------|
|                                                       | status 3 |
|                                                       |----------|
|-------------------------------------------------------|
| HP_icon - HP_BAR                                      |
|                                                       |
| XP_reward_icon - xp_reward                            |   
| other rewards                                         |
|                                                       |
|                                                       |
| Attack_1_name                                         |
|   Attack_1_description                                |
|                                                       |
| Attack_2_name                                         |
|   Attack_2_description                                |
|                                                       |
| Attack_3_name                                         |
|   Attack_3_description                                |
|-------------------------------------------------------|


