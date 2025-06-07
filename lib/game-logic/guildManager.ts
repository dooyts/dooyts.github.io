
// import { GameState, Currency } from '../../types';

// export const joinDefaultGuildLogic = (prev: GameState, defaultGuildName: string): GameState => {
//     if (!prev.guild) {
//         return { ...prev, guild: { id: 'default_guild', name: defaultGuildName, dailyCheckInDone: false } };
//     }
//     return prev;
// };

// export const guildCheckInLogic = (
//     prev: GameState,
//     guildDailyCheckInReward: Partial<Record<Currency, number>>,
//     addCurrencyInternalFn: (currentResources: GameState['resources'], currency: Currency, amount: number) => GameState['resources']
// ): GameState => {
//     if (!prev.guild || prev.guild.dailyCheckInDone) return prev;

//     let tempNewResources = { ...prev.resources };
//     Object.entries(guildDailyCheckInReward).forEach(([key, value]) => {
//         tempNewResources = addCurrencyInternalFn(tempNewResources, key as Currency, value as number);
//     });
//     return { ...prev, guild: { ...prev.guild, dailyCheckInDone: true }, resources: tempNewResources };
// };

// export const checkGuildRedDot = (gameState: GameState): boolean => {
//     return !!gameState.guild && !gameState.guild.dailyCheckInDone;
// }
