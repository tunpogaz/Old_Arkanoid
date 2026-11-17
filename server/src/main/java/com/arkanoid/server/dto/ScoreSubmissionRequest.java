package com.arkanoid.server.dto;

import jakarta.validation.constraints.Min;

public class ScoreSubmissionRequest {
    @Min(value = 0, message = "Score cannot be negative")
    private int score;

    @Min(value = 1, message = "Level reached must be at least 1")
    private int levelReached;

    private int maxCombo;

    public ScoreSubmissionRequest() {}
    public ScoreSubmissionRequest(int score, int levelReached, int maxCombo) {
        this.score = score;
        this.levelReached = levelReached;
        this.maxCombo = maxCombo;
    }

    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }

    public int getLevelReached() { return levelReached; }
    public void setLevelReached(int levelReached) { this.levelReached = levelReached; }

    public int getMaxCombo() { return maxCombo; }
    public void setMaxCombo(int maxCombo) { this.maxCombo = maxCombo; }
}
