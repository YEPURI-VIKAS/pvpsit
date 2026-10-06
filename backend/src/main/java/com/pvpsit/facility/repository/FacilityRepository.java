package com.pvpsit.facility.repository;

import com.pvpsit.facility.model.Facility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FacilityRepository extends JpaRepository<Facility, String> {
    
    @Override
    @Query("SELECT DISTINCT f FROM Facility f LEFT JOIN FETCH f.equipment")
    List<Facility> findAll();
}
