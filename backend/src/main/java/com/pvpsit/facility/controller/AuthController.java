package com.pvpsit.facility.controller;

import com.pvpsit.facility.config.JwtTokenProvider;
import com.pvpsit.facility.model.LoginHistory;
import com.pvpsit.facility.model.User;
import com.pvpsit.facility.repository.LoginHistoryRepository;
import com.pvpsit.facility.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private LoginHistoryRepository loginHistoryRepository;

    private Map<String, Object> buildUserMap(User user) {
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("email", user.getEmail());
        userMap.put("fullName", user.getFullName());
        userMap.put("role", user.getRole());
        userMap.put("avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "");
        userMap.put("avatar_url", user.getAvatarUrl() != null ? user.getAvatarUrl() : "");
        userMap.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        userMap.put("lastLogin", user.getLastLogin() != null ? user.getLastLogin().toString() : null);
        return userMap;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String email = request.get("email");
        String password = request.get("password");
        String fullName = request.get("fullName");
        String role = request.get("role");

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email address already in use."));
        }

        User user = new User(email, passwordEncoder.encode(password), fullName, role);
        if (request.containsKey("avatarUrl")) {
            user.setAvatarUrl(request.get("avatarUrl"));
        }
        User savedUser = userRepository.save(user);

        // Record signup event
        String ip = httpRequest.getRemoteAddr();
        loginHistoryRepository.save(new LoginHistory(savedUser.getId(), savedUser.getEmail(), savedUser.getFullName(), "SIGNUP", ip));

        String token = tokenProvider.generateToken(savedUser.getEmail(), savedUser.getRole(), savedUser.getFullName());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", buildUserMap(savedUser));

        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String email = request.get("email");
        String password = request.get("password");

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid email or password."));
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid email or password."));
        }

        // Update user lastLogin timestamp
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        // Record login event
        String ip = httpRequest.getRemoteAddr();
        loginHistoryRepository.save(new LoginHistory(user.getId(), user.getEmail(), user.getFullName(), "LOGIN", ip));

        String token = tokenProvider.generateToken(user.getEmail(), user.getRole(), user.getFullName());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", buildUserMap(user));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        String email = tokenProvider.getUsernameFromToken(token);
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        return ResponseEntity.ok(buildUserMap(user));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestHeader("Authorization") String authHeader, @RequestBody Map<String, String> request) {
        String token = authHeader.replace("Bearer ", "");
        String email = tokenProvider.getUsernameFromToken(token);
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        if (request.containsKey("fullName") && request.get("fullName") != null) {
            user.setFullName(request.get("fullName"));
        }
        if (request.containsKey("avatarUrl") && request.get("avatarUrl") != null) {
            user.setAvatarUrl(request.get("avatarUrl"));
        } else if (request.containsKey("avatar_url") && request.get("avatar_url") != null) {
            user.setAvatarUrl(request.get("avatar_url"));
        }
        userRepository.save(user);

        String newToken = tokenProvider.generateToken(user.getEmail(), user.getRole(), user.getFullName());

        Map<String, Object> response = new HashMap<>();
        response.put("token", newToken);
        response.put("user", buildUserMap(user));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/password")
    public ResponseEntity<?> changePassword(@RequestHeader("Authorization") String authHeader, @RequestBody Map<String, String> request) {
        String token = authHeader.replace("Bearer ", "");
        String email = tokenProvider.getUsernameFromToken(token);
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Current password is incorrect."));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }
}
