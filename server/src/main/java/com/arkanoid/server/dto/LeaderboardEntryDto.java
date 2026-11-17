package com.arkanoid.server.dto;

import java.time.LocalDateTime;

public class LeaderboardEntryDto {
    private int rank;
    private String username;
    private int score;
    private int levelReached;
    private int maxCombo;
    private LocalDateTime playedAt;

    public LeaderboardEntryDto() {}
    public LeaderboardEntryDto(int rank, String username, int score, int levelReached, int maxCombo, LocalDateTime playedAt) {
        this.rank = rank;
        this.username = username;
        this.score = score;
        this.levelReached = levelReached;
        this.maxCombo = maxCombo;
        this.playedAt = playedAt;
    }

    public int getRank() { return rank; }
    public void setRank(int rank) { this.rank = rank; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }

    public int getLevelReached() { return levelReached; }
    public void setLevelReached(int levelReached) { this.levelReached = levelReached; }

    public int getMaxCombo() { return maxCombo; }
    public void setMaxCombo(int maxCombo) { this.maxCombo = maxCombo; }

    public LocalDateTime getPlayedAt() { return playedAt; }
    public void setPlayedAt(LocalDateTime playedAt) { this.playedAt = playedAt; }
}
