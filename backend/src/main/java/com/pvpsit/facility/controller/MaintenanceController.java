package com.pvpsit.facility.controller;

import com.pvpsit.facility.model.MaintenanceTicket;
import com.pvpsit.facility.repository.MaintenanceTicketRepository;
import com.pvpsit.facility.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
public class MaintenanceController {

    @Autowired
    private MaintenanceTicketRepository ticketRepository;

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public List<MaintenanceTicket> getAllTickets() {
        return ticketRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'FACULTY_STAFF')")
    public ResponseEntity<MaintenanceTicket> createTicket(@RequestBody MaintenanceTicket ticket) {
        MaintenanceTicket saved = ticketRepository.save(ticket);
        // Admin sees new tickets; the person who submitted it gets frontend localStorage notification
        notificationService.sendNotificationToRole("Admin",
            "New Maintenance Request",
            "Issue \"" + saved.getTitle() + "\" reported at " + saved.getLocation() + ".");
        return ResponseEntity.ok(saved);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MaintenanceTicket> updateTicketStatus(@PathVariable String id, @RequestBody Map<String, String> request) {
        String status = request.get("status");
        return ticketRepository.findById(id).map(ticket -> {
            ticket.setStatus(status);
            MaintenanceTicket saved = ticketRepository.save(ticket);
            // Students/Staff get updates when admin changes their ticket status
            notificationService.sendNotificationToRole("Student",
                "Maintenance Update",
                "Your ticket \"" + saved.getTitle() + "\" is now " + saved.getStatus() + ".");
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteTicket(@PathVariable String id) {
        return ticketRepository.findById(id).map(ticket -> {
            ticketRepository.delete(ticket);
            notificationService.sendNotificationToRole("Admin",
                "Maintenance Ticket Deleted",
                "Ticket \"" + ticket.getTitle() + "\" has been deleted.");
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
