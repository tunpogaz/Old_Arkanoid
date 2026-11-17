package com.arkanoid.server;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApiIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String uniqueUser(String prefix) {
        return prefix + "_" + UUID.randomUUID().toString().substring(0, 8);
    }

    private JsonNode postJson(String url, String body, String token) throws Exception {
        var request = post(url)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }
        String response = mockMvc.perform(request)
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response);
    }

    private String register(String username) throws Exception {
        JsonNode node = postJson("/api/auth/register",
                objectMapper.writeValueAsString(Map.of("username", username, "password", "test1234")),
                null);
        return node.get("token").asText();
    }

    @Test
    void healthEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("arkanoid-server"));
    }

    @Test
    void registerIssuesJwtAndLoginWorks() throws Exception {
        String username = uniqueUser("player");
        String token = register(username);

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.authenticated").value(true));

        postJson("/api/auth/login",
                objectMapper.writeValueAsString(Map.of("username", username, "password", "test1234")),
                null);
    }

    @Test
    void invalidRegistrationReturns400InsteadOf403() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"ab\",\"password\":\"1\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("not-json"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void duplicateUsernameIsRejected() throws Exception {
        String username = uniqueUser("dup");
        register(username);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", username, "password", "test1234"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Username already exists"));
    }

    @Test
    void wrongPasswordIsRejected() throws Exception {
        String username = uniqueUser("wrongpw");
        register(username);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("username", username, "password", "nope"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid username or password"));
    }

    @Test
    void protectedEndpointsRequireJwt() throws Exception {
        mockMvc.perform(get("/api/user/profile"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/scores")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"score\":10,\"levelReached\":1,\"maxCombo\":0}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidScorePayloadReturns400() throws Exception {
        String token = register(uniqueUser("badscore"));

        mockMvc.perform(post("/api/scores")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"score\":-5,\"levelReached\":0,\"maxCombo\":-1}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void leaderboardKeepsOnlyEachPlayersBestScore() throws Exception {
        String alice = uniqueUser("alice");
        String bob = uniqueUser("bob");
        String aliceToken = register(alice);
        String bobToken = register(bob);

        // Alice submits twice; only her 1234 run should appear.
        postJson("/api/scores", "{\"score\":1234,\"levelReached\":5,\"maxCombo\":7}", aliceToken);
        postJson("/api/scores", "{\"score\":999,\"levelReached\":3,\"maxCombo\":2}", aliceToken);
        // Bob submits a better score.
        postJson("/api/scores", "{\"score\":2000,\"levelReached\":8,\"maxCombo\":11}", bobToken);

        mockMvc.perform(get("/api/leaderboard?limit=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].username").value(bob))
                .andExpect(jsonPath("$[0].score").value(2000))
                .andExpect(jsonPath("$[0].rank").value(1))
                .andExpect(jsonPath("$[1].username").value(alice))
                .andExpect(jsonPath("$[1].score").value(1234))
                .andExpect(jsonPath("$[1].rank").value(2));
    }

    @Test
    void profileAndProgressTrackBestValues() throws Exception {
        String username = uniqueUser("profile");
        String token = register(username);

        postJson("/api/scores", "{\"score\":1500,\"levelReached\":6,\"maxCombo\":9}", token);
        postJson("/api/scores", "{\"score\":800,\"levelReached\":2,\"maxCombo\":1}", token);

        mockMvc.perform(get("/api/user/profile").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(username))
                .andExpect(jsonPath("$.personalBestScore").value(1500))
                .andExpect(jsonPath("$.highestLevelUnlocked").value(6))
                .andExpect(jsonPath("$.totalGamesPlayed").value(2))
                .andExpect(jsonPath("$.globalRank").value(1));

        postJson("/api/user/progress", "{\"level\":10}", token);
        postJson("/api/user/progress", "{\"level\":3}", token);

        mockMvc.perform(get("/api/user/profile").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.highestLevelUnlocked").value(10));
    }

    @Test
    void progressRejectsInvalidLevel() throws Exception {
        String token = register(uniqueUser("badlevel"));

        mockMvc.perform(post("/api/user/progress")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":0}"))
                .andExpect(status().isBadRequest());
    }
}
