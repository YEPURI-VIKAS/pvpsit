package com.pvpsit.facility.repository;

import com.pvpsit.facility.model.MaintenanceTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MaintenanceTicketRepository extends JpaRepository<MaintenanceTicket, String> {
}
