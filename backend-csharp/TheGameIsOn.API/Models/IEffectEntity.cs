namespace TheGameIsOn.API.Models;

/// <summary>
/// Shared interface between <see cref="Companion"/> and <see cref="BattleEnemy"/> so
/// that services like CardEffectService can operate on both without duck-typing.
/// </summary>
public interface IEffectEntity
{
    string Id { get; }
    int Life { get; set; }
    int Shield { get; set; }
}
