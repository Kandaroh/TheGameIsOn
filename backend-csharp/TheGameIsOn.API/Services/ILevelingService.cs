using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Services;

public interface ILevelingService
{
    int ExpThreshold(int level);
    Companion WithNextLevelExp(Companion companion);
    (Companion Companion, List<PendingAbilityChoice> NewChoices) ProcessLevelUps(Companion companion);
    (List<Companion> Companions, List<PendingAbilityChoice> AllChoices) ProcessAll(List<Companion> companions);
}
