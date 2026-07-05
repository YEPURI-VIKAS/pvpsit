package com.pvpsit.facility.model;

import jakarta.persistence.*;

@Entity
@Table(name = "maintenance_tickets")
public class MaintenanceTicket {
    @Id
    private String id; // e.g. "TKT-1234"

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String location;

    @Column(nullable = false)
    private String priority; // 'Low', 'Medium', 'High'

    @Column(nullable = false)
    private String status; // 'Pending', 'In Progress', 'Completed'

    @Column(nullable = false)
    private String date;

    @Column(name = "assigned_to")
    private String assignedTo;

    public MaintenanceTicket() {}

    public MaintenanceTicket(String id, String title, String location, String priority, String status, String date, String assignedTo) {
        this.id = id;
        this.title = title;
        this.location = location;
        this.priority = priority;
        this.status = status;
        this.date = date;
        this.assignedTo = assignedTo;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public String getAssignedTo() { return assignedTo; }
    public void setAssignedTo(String assignedTo) { this.assignedTo = assignedTo; }
}
