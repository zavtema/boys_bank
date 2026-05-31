package com.example.bank.admin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AdminDailyMetricResponse(
        LocalDate date,
        long operations,
        BigDecimal volume
) {
}
