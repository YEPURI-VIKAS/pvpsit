package com.pvpsit.facility.repository;

import com.pvpsit.facility.model.LoginHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LoginHistoryRepository extends JpaRepository<LoginHistory, Long> {
    List<LoginHistory> findAllByOrderByTimestampDesc();
    List<LoginHistory> findByUserIdOrderByTimestampDesc(Long userId);
}
