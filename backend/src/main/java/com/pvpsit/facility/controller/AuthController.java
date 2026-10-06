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
        User savedUser = userRepository.save(user);

        // Record signup event
        String ip = httpRequest.getRemoteAddr();
        loginHistoryRepository.save(new LoginHistory(savedUser.getId(), savedUser.getEmail(), savedUser.getFullName(), "SIGNUP", ip));

        String token = tokenProvider.generateToken(savedUser.getEmail(), savedUser.getRole(), savedUser.getFullName());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", Map.of(
            "id", savedUser.getId(),
            "email", savedUser.getEmail(),
            "fullName", savedUser.getFullName(),
            "role", savedUser.getRole()
        ));

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

        // Record login event
        String ip = httpRequest.getRemoteAddr();
        loginHistoryRepository.save(new LoginHistory(user.getId(), user.getEmail(), user.getFullName(), "LOGIN", ip));

        String token = tokenProvider.generateToken(user.getEmail(), user.getRole(), user.getFullName());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", Map.of(
            "id", user.getId(),
            "email", user.getEmail(),
            "fullName", user.getFullName(),
            "role", user.getRole()
        ));

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
        return ResponseEntity.ok(Map.of(
            "id", user.getId(),
            "email", user.getEmail(),
            "fullName", user.getFullName(),
            "role", user.getRole()
        ));
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
        if (request.containsKey("fullName")) {
            user.setFullName(request.get("fullName"));
        }
        userRepository.save(user);

        String newToken = tokenProvider.generateToken(user.getEmail(), user.getRole(), user.getFullName());

        Map<String, Object> response = new HashMap<>();
        response.put("token", newToken);
        response.put("user", Map.of(
            "id", user.getId(),
            "email", user.getEmail(),
            "fullName", user.getFullName(),
            "role", user.getRole()
        ));
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
        return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
    }
}
