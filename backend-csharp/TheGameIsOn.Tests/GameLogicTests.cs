using FluentAssertions;
using TheGameIsOn.API.Models;
using TheGameIsOn.API.Services;

namespace TheGameIsOn.Tests;

public class GameLogicTests
{
    private readonly IGameLogicService _gameLogic = TestHelpers.GameLogic();

    [Fact]
    public async Task CreateInitialState_Returns_Valid_State()
    {
        var state = await _gameLogic.CreateInitialStateAsync();

        state.Player.Should().NotBeNull();
        state.Player.Position.Should().Be("start");
        state.Graph.Nodes.Should().HaveCountGreaterThanOrEqualTo(20);
        state.Cards.Should().HaveCount(6);
        state.Companions.Should().BeEmpty();
        state.History.Should().Contain("New run created");
    }

    [Fact]
    public async Task MovePlayer_Valid_Edge_Updates_Position()
    {
        var state = await _gameLogic.CreateInitialStateAsync();

        // Find a valid target from the start node
        var edge = state.Graph.Edges.First(e => e.From == "start");
        var updated = _gameLogic.MovePlayer(state, edge.To);

        updated.Player.Position.Should().Be(edge.To);
        updated.History.Should().Contain($"moved to {edge.To}");
    }

    [Fact]
    public async Task MovePlayer_Invalid_Edge_Appends_History_Error()
    {
        var state = await _gameLogic.CreateInitialStateAsync();

        var updated = _gameLogic.MovePlayer(state, "nonexistent-node");

        updated.Player.Position.Should().Be("start");
        updated.History.Should().Contain("invalid move attempted to nonexistent-node");
    }

    [Fact]
    public async Task PlayCard_Deducts_Mana_And_Moves_To_Discard()
    {
        var state = await _gameLogic.CreateInitialStateAsync();

        // "strike" costs 1 mana and is in the hand
        var updated = _gameLogic.PlayCard(state, "strike");

        updated.Player.Mana.Should().Be(state.Player.Mana - 1);
        updated.Player.Hand.Should().NotContain("strike");
        updated.Player.Discard.Should().Contain("strike");
        updated.History.Should().Contain("played Strike");
    }

    [Fact]
    public async Task PlayCard_Fails_When_Card_Not_In_Hand()
    {
        var state = await _gameLogic.CreateInitialStateAsync();

        var updated = _gameLogic.PlayCard(state, "nonexistent-card");

        updated.Player.Mana.Should().Be(state.Player.Mana);
        updated.History.Should().Contain("could not play nonexistent-card");
    }
}
