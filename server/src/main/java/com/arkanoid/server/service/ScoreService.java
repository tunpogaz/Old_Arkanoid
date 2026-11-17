package com.arkanoid.server.service;

import com.arkanoid.server.dto.LeaderboardEntryDto;
import com.arkanoid.server.dto.ScoreSubmissionRequest;
import com.arkanoid.server.entity.Score;
import com.arkanoid.server.entity.User;
import com.arkanoid.server.entity.UserProgress;
import com.arkanoid.server.repository.ScoreRepository;
import com.arkanoid.server.repository.UserProgressRepository;
import com.arkanoid.server.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ScoreService {

    private final ScoreRepository scoreRepository;
    private final UserRepository userRepository;
    private final UserProgressRepository userProgressRepository;

    public ScoreService(ScoreRepository scoreRepository,
                        UserRepository userRepository,
                        UserProgressRepository userProgressRepository) {
        this.scoreRepository = scoreRepository;
        this.userRepository = userRepository;
        this.userProgressRepository = userProgressRepository;
    }

    @Transactional
    public LeaderboardEntryDto submitScore(String username, ScoreSubmissionRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Score score = new Score(user, request.getScore(), request.getLevelReached(), request.getMaxCombo());
        Score savedScore = scoreRepository.save(score);

        // Update progress if higher level unlocked
        Optional<UserProgress> progressOpt = userProgressRepository.findByUser(user);
        if (progressOpt.isPresent()) {
            UserProgress progress = progressOpt.get();
            if (request.getLevelReached() > progress.getHighestLevelUnlocked()) {
                progress.setHighestLevelUnlocked(request.getLevelReached());
                userProgressRepository.save(progress);
            }
        }

        return new LeaderboardEntryDto(
                0,
                user.getUsername(),
                savedScore.getScore(),
                savedScore.getLevelReached(),
                savedScore.getMaxCombo(),
                savedScore.getPlayedAt()
        );
    }

    public List<LeaderboardEntryDto> getTopLeaderboard(int limit) {
        List<Score> scores = scoreRepository.findTopLeaderboard(PageRequest.of(0, Math.min(limit, 50)));
        List<LeaderboardEntryDto> result = new ArrayList<>();
        int rank = 1;
        for (Score s : scores) {
            result.add(new LeaderboardEntryDto(
                    rank++,
                    s.getUser().getUsername(),
                    s.getScore(),
                    s.getLevelReached(),
                    s.getMaxCombo(),
                    s.getPlayedAt()
            ));
        }
        return result;
    }

    public Optional<LeaderboardEntryDto> getUserBestScore(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return scoreRepository.findFirstByUserOrderByScoreDesc(user)
                .map(s -> new LeaderboardEntryDto(
                        1,
                        user.getUsername(),
                        s.getScore(),
                        s.getLevelReached(),
                        s.getMaxCombo(),
                        s.getPlayedAt()
                ));
    }
}
