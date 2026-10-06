package com.pvpsit.facility.controller;

import com.pvpsit.facility.model.Asset;
import com.pvpsit.facility.repository.AssetRepository;
import com.pvpsit.facility.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assets")
public class AssetController {

    @Autowired
    private AssetRepository assetRepository;

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public List<Asset> getAllAssets() {
        return assetRepository.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Asset> createAsset(@RequestBody Asset asset) {
        Asset saved = assetRepository.save(asset);
        notificationService.sendNotificationToRole("Admin",
            "New Asset Registered",
            "Asset \"" + saved.getName() + "\" (" + saved.getId() + ") has been added to inventory.");
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteAsset(@PathVariable String id) {
        return assetRepository.findById(id).map(asset -> {
            assetRepository.delete(asset);
            notificationService.sendNotificationToRole("Admin",
                "Asset Removed",
                "Asset \"" + asset.getName() + "\" has been deleted from inventory.");
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
