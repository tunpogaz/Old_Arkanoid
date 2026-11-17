package com.arkanoid.server.service;

import com.arkanoid.server.dto.UserProfileDto;
import com.arkanoid.server.entity.Score;
import com.arkanoid.server.entity.User;
import com.arkanoid.server.entity.UserProgress;
import com.arkanoid.server.repository.ScoreRepository;
import com.arkanoid.server.repository.UserProgressRepository;
import com.arkanoid.server.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final UserProgressRepository userProgressRepository;
    private final ScoreRepository scoreRepository;

    public UserService(UserRepository userRepository,
                       UserProgressRepository userProgressRepository,
                       ScoreRepository scoreRepository) {
        this.userRepository = userRepository;
        this.userProgressRepository = userProgressRepository;
        this.scoreRepository = scoreRepository;
    }

    public UserProfileDto getProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        UserProgress progress = userProgressRepository.findByUser(user)
                .orElseGet(() -> userProgressRepository.save(new UserProgress(user)));

        Optional<Score> bestScore = scoreRepository.findFirstByUserOrderByScoreDesc(user);
        int personalBest = bestScore.map(Score::getScore).orElse(0);
        long gamesPlayed = scoreRepository.countByUser(user);
        int rank = gamesPlayed > 0 ? scoreRepository.findUserGlobalRank(user) : 0;

        return new UserProfileDto(
                user.getUsername(),
                progress.getHighestLevelUnlocked(),
                personalBest,
                gamesPlayed,
                rank
        );
    }

    @Transactional
    public UserProfileDto updateProgress(String username, int level) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        UserProgress progress = userProgressRepository.findByUser(user)
                .orElseGet(() -> new UserProgress(user));

        if (level > progress.getHighestLevelUnlocked()) {
            progress.setHighestLevelUnlocked(Math.min(20, level));
            userProgressRepository.save(progress);
        }

        return getProfile(username);
    }
}
