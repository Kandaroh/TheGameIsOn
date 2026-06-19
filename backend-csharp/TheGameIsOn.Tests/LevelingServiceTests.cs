using FluentAssertions;
using TheGameIsOn.API.Models;
using TheGameIsOn.API.Services;

namespace TheGameIsOn.Tests;

public class LevelingServiceTests
{
    private readonly ILevelingService _leveling = TestHelpers.LevelingService();

    [Fact]
    public void ExpThreshold_Returns_Level_Times_100()
    {
        _leveling.ExpThreshold(1).Should().Be(100);
        _leveling.ExpThreshold(5).Should().Be(500);
        _leveling.ExpThreshold(10).Should().Be(1000);
    }

    [Fact]
    public void WithNextLevelExp_Stamps_Threshold()
    {
        var companion = new Companion { Id = "c1", Name = "Test", Level = 3 };
        var result = _leveling.WithNextLevelExp(companion);

        result.NextLevelExp.Should().Be(300);
    }

    [Fact]
    public void ProcessLevelUps_Levels_Up_When_Exp_Sufficient()
    {
        var companion = new Companion
        {
            Id = "c1",
            Name = "Test",
            Level = 1,
            Exp = 100,
            Life = 20,
            MaxLife = 20,
            Energy = 3,
            MaxEnergy = 3
        };

        var (result, _) = _leveling.ProcessLevelUps(companion);

        result.Level.Should().Be(2);
        result.Exp.Should().Be(0);
        result.NextLevelExp.Should().Be(200);
        // HP should have increased by 3
        result.MaxLife.Should().Be(23);
    }

    [Fact]
    public void ProcessLevelUps_Carries_Over_Excess_Exp()
    {
        var companion = new Companion
        {
            Id = "c1",
            Name = "Test",
            Level = 1,
            Exp = 350,  // 100 for level 2, 200 for level 3, 50 left over
            Life = 20,
            MaxLife = 20,
            Energy = 3,
            MaxEnergy = 3
        };

        var (result, _) = _leveling.ProcessLevelUps(companion);

        result.Level.Should().Be(3);
        result.Exp.Should().Be(50);
        result.NextLevelExp.Should().Be(300);
        // HP: 20 + 3 + 3 = 26
        result.MaxLife.Should().Be(26);
    }

    [Fact]
    public void ProcessLevelUps_Grants_Energy_Every_3_Levels()
    {
        var companion = new Companion
        {
            Id = "c1",
            Name = "Test",
            Level = 2,
            Exp = 200, // enough for level 3
            Life = 20,
            MaxLife = 20,
            Energy = 3,
            MaxEnergy = 3
        };

        var (result, _) = _leveling.ProcessLevelUps(companion);

        result.Level.Should().Be(3);
        result.MaxEnergy.Should().Be(4); // +1 at level 3
    }

    [Fact]
    public void ProcessAll_Processes_Multiple_Companions()
    {
        var companions = new List<Companion>
        {
            new() { Id = "c1", Name = "A", Level = 1, Exp = 100, Life = 20, MaxLife = 20, Energy = 3, MaxEnergy = 3 },
            new() { Id = "c2", Name = "B", Level = 1, Exp = 50,  Life = 20, MaxLife = 20, Energy = 3, MaxEnergy = 3 }
        };

        var (result, _) = _leveling.ProcessAll(companions);

        result.Should().HaveCount(2);
        result[0].Level.Should().Be(2);  // enough exp
        result[1].Level.Should().Be(1);  // not enough
    }
}
