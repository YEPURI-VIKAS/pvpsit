package com.pvpsit.facility.model;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "facilities")
public class Facility {
    @Id
    private String id; // e.g. "LH-101"

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private Integer capacity;

    @Column(nullable = false)
    private String status;

    private String image;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "facility_equipment", joinColumns = @JoinColumn(name = "facility_id"))
    @Column(name = "equipment_item")
    private List<String> equipment;

    public Facility() {}

    public Facility(String id, String name, String type, Integer capacity, String status, String image, List<String> equipment) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.capacity = capacity;
        this.status = status;
        this.image = image;
        this.equipment = equipment;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
    public List<String> getEquipment() { return equipment; }
    public void setEquipment(List<String> equipment) { this.equipment = equipment; }
}
