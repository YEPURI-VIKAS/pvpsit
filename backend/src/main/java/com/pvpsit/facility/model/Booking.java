package com.pvpsit.facility.model;

import jakarta.persistence.*;

@Entity
@Table(name = "bookings")
public class Booking {
    @Id
    private String id; // e.g. "BKG-1234"

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String time; // format: "YYYY-MM-DD at HH:MM AM - HH:MM PM"

    @Column(nullable = false)
    private String location;

    @Column(nullable = false)
    private String organizer;

    @Column(nullable = false)
    private String status; // 'Pending', 'Confirmed', 'Rejected'

    @Column
    private String organizerEmail; // student's email for targeted WS notifications

    public Booking() {}

    public Booking(String id, String title, String time, String location, String organizer, String status) {
        this.id = id;
        this.title = title;
        this.time = time;
        this.location = location;
        this.organizer = organizer;
        this.status = status;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getOrganizer() { return organizer; }
    public void setOrganizer(String organizer) { this.organizer = organizer; }
    public String getOrganizerEmail() { return organizerEmail; }
    public void setOrganizerEmail(String organizerEmail) { this.organizerEmail = organizerEmail; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
