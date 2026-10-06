package com.pvpsit.facility.repository;

import com.pvpsit.facility.model.Asset;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AssetRepository extends JpaRepository<Asset, String> {
}
