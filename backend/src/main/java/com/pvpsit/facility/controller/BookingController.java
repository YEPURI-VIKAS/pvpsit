package com.pvpsit.facility.controller;

import com.pvpsit.facility.model.Booking;
import com.pvpsit.facility.repository.BookingRepository;
import com.pvpsit.facility.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Booking> createBooking(@RequestBody Booking booking) {
        Booking saved = bookingRepository.save(booking);
        // Only admins need to see new booking requests
        notificationService.sendNotificationToRole("Admin",
            "New Booking Request",
            "A new booking request has been submitted for " + saved.getLocation() + ".");
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Booking> updateBookingStatus(@PathVariable String id, @RequestBody Map<String, String> request) {
        String status = request.get("status");
        return bookingRepository.findById(id).map(booking -> {
            booking.setStatus(status);
            Booking saved = bookingRepository.save(booking);

            String title = "Booking " + status;
            String desc = "Confirmed".equals(status)
                ? "Great news! Your booking for " + saved.getLocation() + " has been confirmed."
                : "Rejected".equals(status)
                ? "Your booking for " + saved.getLocation() + " has been rejected by the admin."
                : "Your booking for " + saved.getLocation() + " status changed to: " + status + ".";

            // Only students should see booking confirmations/rejections
            notificationService.sendNotificationToRole("Student", title, desc);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }
}
