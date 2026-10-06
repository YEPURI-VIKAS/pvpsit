package com.pvpsit.facility.config;

import com.pvpsit.facility.model.*;
import com.pvpsit.facility.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Collections;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FacilityRepository facilityRepository;

    @Autowired
    private AssetRepository assetRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private MaintenanceTicketRepository ticketRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Initialize Admin and Faculty Users
        if (userRepository.count() == 0) {
            User admin1 = new User(
                "admin1@pvpsit.edu.in",
                passwordEncoder.encode("admin123"),
                "Admin One",
                "Admin"
            );
            User admin2 = new User(
                "admin2@pvpsit.edu.in",
                passwordEncoder.encode("admin123"),
                "Admin Two",
                "Admin"
            );
            User admin3 = new User(
                "admin3@pvpsit.edu.in",
                passwordEncoder.encode("admin123"),
                "Admin Three",
                "Admin"
            );
            User faculty = new User(
                "faculty@pvpsit.edu.in",
                passwordEncoder.encode("faculty123"),
                "Dr. Prasad",
                "Faculty / Staff"
            );
            userRepository.saveAll(Arrays.asList(admin1, admin2, admin3, faculty));
        }

        // Initialize Facilities
        if (facilityRepository.count() == 0) {
            facilityRepository.save(new Facility(
                "LH-101",
                "Lecture Hall 101",
                "Classroom",
                60,
                "Available",
                "https://images.unsplash.com/photo-1541339907198-e08756dedf3f",
                Arrays.asList("Projector", "Air Conditioning", "Whiteboard")
            ));
            facilityRepository.save(new Facility(
                "LH-102",
                "Lecture Hall 102",
                "Classroom",
                60,
                "Available",
                "https://images.unsplash.com/photo-1541339907198-e08756dedf3f",
                Arrays.asList("Projector", "Whiteboard")
            ));
            facilityRepository.save(new Facility(
                "SEM-01",
                "Seminar Hall A",
                "Seminar Hall",
                150,
                "In Use",
                "https://images.unsplash.com/photo-1492538368677-f6e0afe31dcc",
                Arrays.asList("Projector", "Air Conditioning", "Sound System", "Stage")
            ));
            facilityRepository.save(new Facility(
                "LAB-01",
                "CSE Lab 1",
                "Lab",
                80,
                "Available",
                "https://images.unsplash.com/photo-1581092921461-eab62e97a780",
                Arrays.asList("Computers", "Air Conditioning", "Projector")
            ));
        }

        // Initialize LH 101-110, 201-210, 301-310, 401-410
        for (int floor = 1; floor <= 4; floor++) {
            for (int room = 1; room <= 10; room++) {
                String id = String.format("LH-%d%02d", floor, room);
                if (!facilityRepository.existsById(id)) {
                    facilityRepository.save(new Facility(
                        id,
                        "Lecture Hall " + id.substring(3),
                        "Classroom",
                        60,
                        "Available",
                        "https://images.unsplash.com/photo-1541339907198-e08756dedf3f",
                        Arrays.asList("Projector", "Whiteboard")
                    ));
                }
            }
        }

        // Initialize Assets
        if (assetRepository.count() == 0) {
            assetRepository.save(new Asset("AST-1001", "Sony Projector EX450", "Equipment", "Seminar Hall A", "Active", "May 10, 2026"));
            assetRepository.save(new Asset("AST-1002", "Dell Optiplex 7090", "Computer", "CSE Lab 1", "Active", "Apr 15, 2026"));
            assetRepository.save(new Asset("AST-1003", "Voltas 2 Ton AC", "Electronics", "LH-101", "Active", "May 01, 2026"));
        }

        // Initialize Bookings
        if (bookingRepository.count() == 0) {
            bookingRepository.save(new Booking(
                "BKG-3001",
                "Guest Lecture on AI",
                "2026-05-20 at 10:00 AM - 12:00 PM",
                "Seminar Hall A",
                "Dr. Prasad",
                "Approved"
            ));
        }

        // Initialize Maintenance Tickets
        if (ticketRepository.count() == 0) {
            ticketRepository.save(new MaintenanceTicket(
                "TKT-2001",
                "Projector not turning on",
                "Lecture Hall 102",
                "High",
                "Pending",
                "May 18, 2026",
                "Ramu"
            ));
            ticketRepository.save(new MaintenanceTicket(
                "TKT-2002",
                "AC Remote missing",
                "CSE Lab 1",
                "Medium",
                "Resolved",
                "May 19, 2026",
                "Unassigned"
            ));
        }
    }
}
