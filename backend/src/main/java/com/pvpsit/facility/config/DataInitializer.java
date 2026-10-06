package com.pvpsit.facility.config;

import com.pvpsit.facility.model.*;
import com.pvpsit.facility.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

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
    private LoginHistoryRepository loginHistoryRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Initialize Default Users
        if (userRepository.count() == 0) {
            User admin1 = new User("admin@pvpsit.edu", passwordEncoder.encode("admin"), "System Admin", "Admin");
            User admin2 = new User("admin1@pvpsit.edu.in", passwordEncoder.encode("admin123"), "Admin One", "Admin");
            User student1 = new User("student@pvpsit.edu", passwordEncoder.encode("student"), "Student User", "Student");
            User staff1 = new User("staff@pvpsit.edu", passwordEncoder.encode("staff"), "Faculty Staff", "Faculty / Staff");
            User faculty = new User("faculty@pvpsit.edu.in", passwordEncoder.encode("faculty123"), "Dr. Prasad", "Faculty / Staff");
            
            List<User> savedUsers = userRepository.saveAll(Arrays.asList(admin1, admin2, student1, staff1, faculty));
            
            // Seed initial login history
            for (User u : savedUsers) {
                loginHistoryRepository.save(new LoginHistory(u.getId(), u.getEmail(), u.getFullName(), "LOGIN", "127.0.0.1"));
            }
        }

        // Initialize Core Campus Facilities
        if (facilityRepository.count() == 0) {
            List<Facility> defaultFacilities = Arrays.asList(
                new Facility(
                    "FAC-001",
                    "Main Auditorium",
                    "Auditorium",
                    500,
                    "Available",
                    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80",
                    Arrays.asList("Projector", "Microphone", "AC", "Stage Lighting", "Sound System")
                ),
                new Facility(
                    "FAC-002",
                    "CSE Lab 1",
                    "Computer Lab",
                    60,
                    "Available",
                    "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80",
                    Arrays.asList("60 High-End PCs", "Projector", "Air Conditioning", "High-Speed LAN")
                ),
                new Facility(
                    "FAC-003",
                    "CN Lab",
                    "Computer Lab",
                    30,
                    "Available",
                    "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800&q=80",
                    Arrays.asList("30 PCs", "Cisco Routers", "Network Switches", "Air Conditioning")
                ),
                new Facility(
                    "FAC-004",
                    "AI & Machine Learning Lab",
                    "Computer Lab",
                    40,
                    "Available",
                    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
                    Arrays.asList("GPU Workstations", "Smart Board", "Air Conditioning", "Dual Monitors")
                ),
                new Facility(
                    "FAC-005",
                    "Seminar Hall A",
                    "Seminar Hall",
                    150,
                    "Available",
                    "https://images.unsplash.com/photo-1492538368677-f6e0afe31dcc?auto=format&fit=crop&w=800&q=80",
                    Arrays.asList("Projector", "Air Conditioning", "Sound System", "Podium Mic")
                ),
                new Facility(
                    "FAC-006",
                    "Seminar Hall B",
                    "Seminar Hall",
                    120,
                    "Available",
                    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
                    Arrays.asList("Projector", "Air Conditioning", "Whiteboard", "Wireless Mics")
                ),
                new Facility(
                    "FAC-007",
                    "IoT & Embedded Systems Lab",
                    "Lab",
                    35,
                    "Available",
                    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
                    Arrays.asList("Arduino/Raspberry Pi Kits", "Oscilloscopes", "Soldering Stations")
                ),
                new Facility(
                    "FAC-008",
                    "Mechanical CAD/CAM Lab",
                    "Lab",
                    50,
                    "Available",
                    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
                    Arrays.asList("CAD Workstations", "3D Printers", "CNC Simulator")
                ),
                new Facility(
                    "FAC-009",
                    "Electrical Machines Lab",
                    "Lab",
                    45,
                    "Available",
                    "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
                    Arrays.asList("DC Motors", "Transformers", "Control Panels", "Safety Gear")
                ),
                new Facility(
                    "FAC-010",
                    "Digital Library & E-Learning",
                    "Library",
                    80,
                    "Available",
                    "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80",
                    Arrays.asList("40 Terminals", "IEEE Access", "Silent Zone", "Air Conditioning")
                ),
                new Facility(
                    "FAC-011",
                    "Central Library Reading Hall",
                    "Library",
                    250,
                    "Available",
                    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
                    Arrays.asList("Study Pods", "Reference Section", "Charging Points", "Wi-Fi")
                ),
                new Facility(
                    "FAC-012",
                    "Indoor Sports Complex",
                    "Sports",
                    200,
                    "Available",
                    "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80",
                    Arrays.asList("Badminton Courts", "Table Tennis", "Locker Rooms", "First Aid Kit")
                ),
                new Facility(
                    "FAC-013",
                    "Board Room / Conference Hall",
                    "Conference",
                    30,
                    "Available",
                    "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?auto=format&fit=crop&w=800&q=80",
                    Arrays.asList("Video Conferencing", "Smart Display", "Air Conditioning", "Microphones")
                )
            );

            facilityRepository.saveAll(defaultFacilities);

            // Initialize Lecture Halls LH-101 to LH-105, LH-201 to LH-205, LH-301 to LH-305, LH-401 to LH-405
            for (int floor = 1; floor <= 4; floor++) {
                for (int room = 1; room <= 5; room++) {
                    String id = String.format("LH-%d%02d", floor, room);
                    facilityRepository.save(new Facility(
                        id,
                        "Lecture Hall " + id.substring(3),
                        "Classroom",
                        60,
                        "Available",
                        "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80",
                        Arrays.asList("Projector", "Whiteboard", "Speaker System")
                    ));
                }
            }
        }

        // Initialize Sample Assets
        if (assetRepository.count() == 0) {
            assetRepository.save(new Asset("AST-1001", "Sony 4K Laser Projector", "Equipment", "Main Auditorium", "Active", "May 10, 2026"));
            assetRepository.save(new Asset("AST-1002", "Dell Optiplex 7090 Desktop", "Computer", "CSE Lab 1", "Active", "Apr 15, 2026"));
            assetRepository.save(new Asset("AST-1003", "Voltas 2 Ton Split AC", "Electronics", "LH-101", "Active", "May 01, 2026"));
            assetRepository.save(new Asset("AST-1004", "Cisco Catalyst 2960 Switch", "Network", "CN Lab", "Active", "Jun 12, 2026"));
            assetRepository.save(new Asset("AST-1005", "Bose Professional Sound System", "Audio", "Seminar Hall A", "Active", "Mar 20, 2026"));
        }

        // Initialize Sample Bookings
        if (bookingRepository.count() == 0) {
            bookingRepository.save(new Booking(
                "BKG-3001",
                "Guest Lecture on Artificial Intelligence",
                "2026-10-15 at 10:00 AM - 12:00 PM",
                "Seminar Hall A",
                "Dr. Prasad",
                "Approved"
            ));
            bookingRepository.save(new Booking(
                "BKG-3002",
                "Computer Networks Workshop",
                "2026-10-16 at 02:00 PM - 04:00 PM",
                "CN Lab",
                "Faculty Staff",
                "Approved"
            ));
        }

        // Initialize Sample Maintenance Tickets
        if (ticketRepository.count() == 0) {
            ticketRepository.save(new MaintenanceTicket(
                "TKT-2001",
                "Projector lamp replacement required",
                "Lecture Hall 102",
                "High",
                "Open",
                "Oct 05, 2026",
                "Ramu"
            ));
            ticketRepository.save(new MaintenanceTicket(
                "TKT-2002",
                "AC remote missing",
                "CSE Lab 1",
                "Medium",
                "Resolved",
                "Oct 04, 2026",
                "Unassigned"
            ));
        }
    }
}
