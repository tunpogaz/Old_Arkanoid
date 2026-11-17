package com.arkanoid.server.controller;

import com.arkanoid.server.dto.UserProfileDto;
import com.arkanoid.server.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        UserProfileDto profile = userService.getProfile(authentication.getName());
        return ResponseEntity.ok(profile);
    }

    @PostMapping("/progress")
    public ResponseEntity<?> updateProgress(Authentication authentication,
                                            @RequestBody Map<String, Integer> payload) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        Integer level = payload.get("level");
        if (level == null || level < 1) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid level"));
        }
        UserProfileDto profile = userService.updateProgress(authentication.getName(), level);
        return ResponseEntity.ok(profile);
    }
}
