package com.pvpsit.facility.repository;

import com.pvpsit.facility.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, String> {
    List<Booking> findByOrganizer(String organizer);
}
