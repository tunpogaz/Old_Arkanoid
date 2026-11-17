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
    
    @Query("SELECT s FROM Score s JOIN FETCH s.user ORDER BY s.score DESC, s.playedAt ASC")
    List<Score> findTopLeaderboard(Pageable pageable);

    @Query("SELECT s FROM Score s JOIN FETCH s.user WHERE s.levelReached = :level ORDER BY s.score DESC")
    List<Score> findTopByLevel(int level, Pageable pageable);

    List<Score> findByUserOrderByScoreDesc(User user);
    
    Optional<Score> findFirstByUserOrderByScoreDesc(User user);
}
