package com.arkanoid.server.dto;

public class UserProfileDto {
    private String username;
    private int highestLevelUnlocked;
    private int personalBestScore;
    private long totalGamesPlayed;
    private int globalRank;

    public UserProfileDto() {}

    public UserProfileDto(String username, int highestLevelUnlocked, int personalBestScore, long totalGamesPlayed, int globalRank) {
        this.username = username;
        this.highestLevelUnlocked = highestLevelUnlocked;
        this.personalBestScore = personalBestScore;
        this.totalGamesPlayed = totalGamesPlayed;
        this.globalRank = globalRank;
    }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public int getHighestLevelUnlocked() { return highestLevelUnlocked; }
    public void setHighestLevelUnlocked(int highestLevelUnlocked) { this.highestLevelUnlocked = highestLevelUnlocked; }

    public int getPersonalBestScore() { return personalBestScore; }
    public void setPersonalBestScore(int personalBestScore) { this.personalBestScore = personalBestScore; }

    public long getTotalGamesPlayed() { return totalGamesPlayed; }
    public void setTotalGamesPlayed(long totalGamesPlayed) { this.totalGamesPlayed = totalGamesPlayed; }

    public int getGlobalRank() { return globalRank; }
    public void setGlobalRank(int globalRank) { this.globalRank = globalRank; }
}
