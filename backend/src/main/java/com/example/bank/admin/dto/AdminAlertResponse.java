package com.example.bank.admin.dto;

public record AdminAlertResponse(
        String severity,
        String title,
        String description,
        String actionLabel
) {
}
