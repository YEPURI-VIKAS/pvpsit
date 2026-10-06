package com.pvpsit.facility.controller;

import com.pvpsit.facility.model.Facility;
import com.pvpsit.facility.model.Booking;
import com.pvpsit.facility.repository.FacilityRepository;
import com.pvpsit.facility.repository.BookingRepository;
import com.pvpsit.facility.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.LocalDate;
import java.time.ZoneId;
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

    // Pattern for: 2026-10-06 at 10:00 AM - 12:00 PM or 12-10-2026 at 9:00 AM - 11:00 AM
    private static final Pattern RANGE_PATTERN = Pattern.compile(
        "^(\\d{2,4}[-/]\\d{1,2}[-/]\\d{2,4})\\s+at\\s+(\\d{1,2}:\\d{2}\\s*[AP]M)\\s*-\\s*(\\d{1,2}:\\d{2}\\s*[AP]M)$",
        Pattern.CASE_INSENSITIVE
    );

    // Pattern for: 2026-10-06 at 10:00 AM
    private static final Pattern SINGLE_PATTERN = Pattern.compile(
        "^(\\d{2,4}[-/]\\d{1,2}[-/]\\d{2,4})\\s+at\\s+(\\d{1,2}:\\d{2}\\s*[AP]M)$",
        Pattern.CASE_INSENSITIVE
    );

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("h:mm a", Locale.US);
    private static final DateTimeFormatter TIME_FORMATTER_2 = DateTimeFormatter.ofPattern("hh:mm a", Locale.US);

    private LocalDate parseDate(String dateStr) {
        dateStr = dateStr.trim();
        try {
            if (dateStr.contains("-")) {
                String[] parts = dateStr.split("-");
                if (parts[0].length() == 4) {
                    return LocalDate.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));
                } else if (parts[2].length() == 4) {
                    return LocalDate.of(Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
                }
            } else if (dateStr.contains("/")) {
                String[] parts = dateStr.split("/");
                if (parts[0].length() == 4) {
                    return LocalDate.of(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));
                } else if (parts[2].length() == 4) {
                    return LocalDate.of(Integer.parseInt(parts[2]), Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
                }
            }
        } catch (Exception e) {
            // fallback
        }
        return LocalDate.now();
    }

    private LocalTime parseTime(String timeStr) {
        timeStr = timeStr.trim().toUpperCase();
        if (!timeStr.contains(" ")) {
            timeStr = timeStr.replace("AM", " AM").replace("PM", " PM");
        }
        try {
            return LocalTime.parse(timeStr, TIME_FORMATTER);
        } catch (Exception e) {
            return LocalTime.parse(timeStr, TIME_FORMATTER_2);
        }
    }

    private boolean isCurrentlyActive(String timeStr) {
        if (timeStr == null || timeStr.trim().isEmpty()) {
            return false;
        }
        try {
            // Use India Standard Time (Asia/Kolkata) since PVPSIT is in India
            ZoneId zoneId = ZoneId.of("Asia/Kolkata");
            LocalDateTime now = LocalDateTime.now(zoneId);
            LocalDate today = now.toLocalDate();
            LocalTime currentTime = now.toLocalTime();

            // Try Range Pattern (e.g. 2026-10-06 at 10:00 AM - 12:00 PM)
            Matcher rangeMatcher = RANGE_PATTERN.matcher(timeStr.trim());
            if (rangeMatcher.matches()) {
                LocalDate bookingDate = parseDate(rangeMatcher.group(1));
                if (!bookingDate.equals(today)) {
                    return false;
                }
                LocalTime startTime = parseTime(rangeMatcher.group(2));
                LocalTime endTime = parseTime(rangeMatcher.group(3));
                return !currentTime.isBefore(startTime) && !currentTime.isAfter(endTime);
            }

            // Try Single Pattern (e.g. 2026-10-06 at 08:00 PM)
            Matcher singleMatcher = SINGLE_PATTERN.matcher(timeStr.trim());
            if (singleMatcher.matches()) {
                LocalDate bookingDate = parseDate(singleMatcher.group(1));
                if (!bookingDate.equals(today)) {
                    return false;
                }
                LocalTime startTime = parseTime(singleMatcher.group(2));
                LocalTime endTime = startTime.plusHours(1); // default 1 hour
                return !currentTime.isBefore(startTime) && !currentTime.isAfter(endTime);
            }
        } catch (Exception e) {
            System.err.println("Error checking active booking time: " + timeStr + " - " + e.getMessage());
        }
        return false;
    }

    private synchronized void updateFacilityStatuses() {
        List<Facility> facilities = facilityRepository.findAll();
        List<Booking> bookings = bookingRepository.findAll();

        for (Facility facility : facilities) {
            if ("Maintenance".equalsIgnoreCase(facility.getStatus())) {
                continue;
            }

            boolean hasActiveBooking = false;
            for (Booking booking : bookings) {
                boolean matchesFacility = false;
                if (booking.getLocation() != null) {
                    if (booking.getLocation().equalsIgnoreCase(facility.getName()) || 
                        booking.getLocation().equalsIgnoreCase(facility.getId())) {
                        matchesFacility = true;
                    }
                }
                if (booking.getFacilityId() != null && booking.getFacilityId().equalsIgnoreCase(facility.getId())) {
                    matchesFacility = true;
                }

                if (matchesFacility) {
                    String status = booking.getStatus();
                    if (("Approved".equalsIgnoreCase(status) || "Confirmed".equalsIgnoreCase(status) || "Pending".equalsIgnoreCase(status))
                            && isCurrentlyActive(booking.getTime())) {
                        hasActiveBooking = true;
                        break;
                    }
                }
            }

            String targetStatus = hasActiveBooking ? "In Use" : "Available";
            if (!targetStatus.equalsIgnoreCase(facility.getStatus())) {
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
    public ResponseEntity<Facility> createFacility(@RequestBody Facility facility) {
        Facility saved = facilityRepository.save(facility);
        notificationService.sendNotification(
            "New Facility Added", 
            "Facility \"" + saved.getName() + "\" (Room " + saved.getId() + ") has been added."
        );
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/{id}")
    @PutMapping("/{id}")
    public ResponseEntity<Facility> updateFacility(@PathVariable String id, @RequestBody Facility facilityDetails) {
        return facilityRepository.findById(id).map(facility -> {
            if (facilityDetails.getName() != null) facility.setName(facilityDetails.getName());
            if (facilityDetails.getType() != null) facility.setType(facilityDetails.getType());
            if (facilityDetails.getCapacity() != null) facility.setCapacity(facilityDetails.getCapacity());
            if (facilityDetails.getStatus() != null) facility.setStatus(facilityDetails.getStatus());
            if (facilityDetails.getImage() != null) facility.setImage(facilityDetails.getImage());
            if (facilityDetails.getEquipment() != null) facility.setEquipment(facilityDetails.getEquipment());
            Facility updated = facilityRepository.save(facility);
            return ResponseEntity.ok(updated);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
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
