package com.pvpsit.facility.controller;

import com.pvpsit.facility.model.LoginHistory;
import com.pvpsit.facility.repository.LoginHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/login-history")
public class LoginHistoryController {

    @Autowired
    private LoginHistoryRepository loginHistoryRepository;

    @GetMapping
    public List<LoginHistory> getAllLoginHistory() {
        return loginHistoryRepository.findAllByOrderByTimestampDesc();
    }

    @GetMapping("/user/{userId}")
    public List<LoginHistory> getLoginHistoryByUser(@PathVariable Long userId) {
        return loginHistoryRepository.findByUserIdOrderByTimestampDesc(userId);
    }
}
