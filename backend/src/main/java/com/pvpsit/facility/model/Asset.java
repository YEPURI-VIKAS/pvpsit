package com.pvpsit.facility.model;

import jakarta.persistence.*;

@Entity
@Table(name = "assets")
public class Asset {
    @Id
    private String id; // e.g. "AST-1234"

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String location;

    @Column(nullable = false)
    private String status;

    @Column(name = "purchase_date")
    private String purchaseDate;

    public Asset() {}

    public Asset(String id, String name, String category, String location, String status, String purchaseDate) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.location = location;
        this.status = status;
        this.purchaseDate = purchaseDate;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(String purchaseDate) { this.purchaseDate = purchaseDate; }
}
