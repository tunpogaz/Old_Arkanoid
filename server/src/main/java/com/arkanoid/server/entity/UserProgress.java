package com.arkanoid.server.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_progress")
public class UserProgress {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "highest_level_unlocked", nullable = false)
    private int highestLevelUnlocked = 1;

    @Column(name = "total_stars", nullable = false)
    private int totalStars = 0;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public UserProgress() {}

    public UserProgress(User user) {
        this.user = user;
        this.highestLevelUnlocked = 1;
        this.totalStars = 0;
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public int getHighestLevelUnlocked() { return highestLevelUnlocked; }
    public void setHighestLevelUnlocked(int highestLevelUnlocked) { this.highestLevelUnlocked = highestLevelUnlocked; }

    public int getTotalStars() { return totalStars; }
    public void setTotalStars(int totalStars) { this.totalStars = totalStars; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
