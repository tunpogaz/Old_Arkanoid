package com.arkanoid.server.repository;

import com.arkanoid.server.entity.Score;
import com.arkanoid.server.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScoreRepository extends JpaRepository<Score, Long> {
    
    // One row per player: each player's personal best score only.
    // The second condition breaks ties by keeping the first score that reached that best.
    @Query("SELECT s FROM Score s JOIN FETCH s.user " +
            "WHERE s.score = (SELECT MAX(s2.score) FROM Score s2 WHERE s2.user = s.user) " +
            "AND s.id = (SELECT MIN(s3.id) FROM Score s3 WHERE s3.user = s.user AND s3.score = s.score) " +
            "ORDER BY s.score DESC, s.playedAt ASC")
    List<Score> findTopLeaderboard(Pageable pageable);

    @Query("SELECT s FROM Score s JOIN FETCH s.user WHERE s.levelReached = :level ORDER BY s.score DESC")
    List<Score> findTopByLevel(int level, Pageable pageable);

    List<Score> findByUserOrderByScoreDesc(User user);
    
    Optional<Score> findFirstByUserOrderByScoreDesc(User user);

    long countByUser(User user);

    // Rank players (not score rows): count distinct players whose best score is higher.
    @Query("SELECT COUNT(DISTINCT s.user) + 1 FROM Score s WHERE s.score > (" +
            "SELECT COALESCE(MAX(s2.score), 0) FROM Score s2 WHERE s2.user = :user)")
    int findUserGlobalRank(User user);
}
