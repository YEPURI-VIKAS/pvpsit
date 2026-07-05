package com.pvpsit.facility.controller;

import com.pvpsit.facility.model.Facility;
import com.pvpsit.facility.model.Booking;
import com.pvpsit.facility.repository.FacilityRepository;
import com.pvpsit.facility.repository.BookingRepository;
import com.pvpsit.facility.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/facilities")
public class FacilityController {

    @Autowired
    private FacilityRepository facilityRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private NotificationService notificationService;

    private static final Pattern RANGE_PATTERN = Pattern.compile(
        "^(\\d{4}-\\d{2}-\\d{2})\\s+at\\s+(\\d{2}:\\d{2}\\s+[AP]M)\\s*-\\s*(\\d{2}:\\d{2}\\s+[AP]M)$",
        Pattern.CASE_INSENSITIVE
    );

    private static final Pattern SINGLE_PATTERN = Pattern.compile(
        "^(\\d{4}-\\d{2}-\\d{2})\\s+at\\s+(\\d{2}:\\d{2}\\s+[AP]M)$",
        Pattern.CASE_INSENSITIVE
    );

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("hh:mm a", Locale.US);

    private boolean isCurrentlyActive(String timeStr) {
        System.out.println("DEBUG: isCurrentlyActive: checking \"" + timeStr + "\"");
        if (timeStr == null || timeStr.trim().isEmpty()) {
            return false;
        }
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDate today = now.toLocalDate();
            LocalTime currentTime = now.toLocalTime();
            System.out.println("DEBUG: Current time info: today=" + today + ", currentTime=" + currentTime);

            // Try Range Pattern (e.g. 2026-05-19 at 08:00 AM - 10:00 AM)
            Matcher rangeMatcher = RANGE_PATTERN.matcher(timeStr.trim());
            if (rangeMatcher.matches()) {
                LocalDate bookingDate = LocalDate.parse(rangeMatcher.group(1));
                System.out.println("DEBUG: Range pattern matches. Booking date: " + bookingDate);
                if (!bookingDate.equals(today)) {
                    return false;
                }
                LocalTime startTime = LocalTime.parse(rangeMatcher.group(2).toUpperCase(), TIME_FORMATTER);
                LocalTime endTime = LocalTime.parse(rangeMatcher.group(3).toUpperCase(), TIME_FORMATTER);
                System.out.println("DEBUG: Range parsed: startTime=" + startTime + ", endTime=" + endTime + ". Checks: isBefore=" + currentTime.isBefore(startTime) + ", isAfter=" + currentTime.isAfter(endTime));
                return !currentTime.isBefore(startTime) && !currentTime.isAfter(endTime);
            }

            // Try Single Pattern (e.g. 2026-05-19 at 08:00 PM)
            Matcher singleMatcher = SINGLE_PATTERN.matcher(timeStr.trim());
            if (singleMatcher.matches()) {
                LocalDate bookingDate = LocalDate.parse(singleMatcher.group(1));
                System.out.println("DEBUG: Single pattern matches. Booking date: " + bookingDate);
                if (!bookingDate.equals(today)) {
                    return false;
                }
                LocalTime startTime = LocalTime.parse(singleMatcher.group(2).toUpperCase(), TIME_FORMATTER);
                LocalTime endTime = startTime.plusHours(1); // default 1 hour duration
                System.out.println("DEBUG: Single parsed: startTime=" + startTime + ", endTime=" + endTime + ". Checks: isBefore=" + currentTime.isBefore(startTime) + ", isAfter=" + currentTime.isAfter(endTime));
                return !currentTime.isBefore(startTime) && !currentTime.isAfter(endTime);
            }
            System.out.println("DEBUG: No patterns matched for \"" + timeStr + "\"");
        } catch (Exception e) {
            System.err.println("Error parsing booking time: " + timeStr + " - " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }

    private synchronized void updateFacilityStatuses() {
        List<Facility> facilities = facilityRepository.findAll();
        List<Booking> bookings = bookingRepository.findAll();
        System.out.println("DEBUG: updateFacilityStatuses: Found " + facilities.size() + " facilities and " + bookings.size() + " bookings.");

        for (Facility facility : facilities) {
            // Maintenance status should NOT be overwritten by booking status
            if ("Maintenance".equalsIgnoreCase(facility.getStatus())) {
                continue;
            }

            boolean hasActiveBooking = false;
            for (Booking booking : bookings) {
                if (booking.getLocation() != null && booking.getLocation().equalsIgnoreCase(facility.getName())) {
                    String status = booking.getStatus();
                    System.out.println("DEBUG: Facility " + facility.getName() + " matches booking for " + booking.getLocation() + " with status: " + status + ", time: " + booking.getTime());
                    if (("Approved".equalsIgnoreCase(status) || "Confirmed".equalsIgnoreCase(status) || "Pending".equalsIgnoreCase(status))
                            && isCurrentlyActive(booking.getTime())) {
                        hasActiveBooking = true;
                        System.out.println("DEBUG: Booking is currently active for " + facility.getName());
                        break;
                    }
                }
            }

            String targetStatus = hasActiveBooking ? "In Use" : "Available";
            if (!targetStatus.equalsIgnoreCase(facility.getStatus())) {
                System.out.println("DEBUG: Updating facility " + facility.getName() + " status from " + facility.getStatus() + " to " + targetStatus);
                facility.setStatus(targetStatus);
                facilityRepository.save(facility);
            }
        }
    }

    @GetMapping
    public List<Facility> getAllFacilities() {
        updateFacilityStatuses();
        return facilityRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'FACULTY_STAFF')")
    public ResponseEntity<Facility> createFacility(@RequestBody Facility facility) {
        Facility saved = facilityRepository.save(facility);
        notificationService.sendNotification(
            "New Facility Added", 
            "Facility \"" + saved.getName() + "\" (Room " + saved.getId() + ") has been added."
        );
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteFacility(@PathVariable String id) {
        return facilityRepository.findById(id).map(facility -> {
            facilityRepository.delete(facility);
            notificationService.sendNotification(
                "Facility Removed", 
                "Facility \"" + facility.getName() + "\" has been removed."
            );
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
