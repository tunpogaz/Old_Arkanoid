package com.arkanoid.server.controller;

import com.arkanoid.server.dto.LeaderboardEntryDto;
import com.arkanoid.server.dto.ScoreSubmissionRequest;
import com.arkanoid.server.service.ScoreService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/scores")
public class ScoreController {

    private final ScoreService scoreService;

    public ScoreController(ScoreService scoreService) {
        this.scoreService = scoreService;
    }

    @PostMapping
    public ResponseEntity<?> submitScore(Authentication authentication,
                                         @Valid @RequestBody ScoreSubmissionRequest request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        LeaderboardEntryDto result = scoreService.submitScore(authentication.getName(), request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/my-best")
    public ResponseEntity<?> getMyBestScore(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        return scoreService.getUserBestScore(authentication.getName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
