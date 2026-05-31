package com.example.bank.admin.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record AdminAnalyticsResponse(
        long totalUsers,
        long totalAdmins,
        long totalAccounts,
        BigDecimal totalBalance,
        long totalCards,
        long activeCards,
        long blockedCards,
        long totalTransactions,
        BigDecimal totalTransactionVolume,
        long transactionsToday,
        BigDecimal transactionVolumeToday,
        long pendingLoans,
        BigDecimal loanPortfolio,
        long activeDeposits,
        BigDecimal depositPortfolio,
        long suspiciousTransactions,
        long newFraudReviews,
        long reviewedFraudTransactions,
        Map<String, Long> usersByRole,
        Map<String, Long> transactionsByType,
        List<AdminDailyMetricResponse> dailyMetrics,
        List<AdminAlertResponse> alerts
) {
}
