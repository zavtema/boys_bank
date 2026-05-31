package com.example.bank.admin.service;

import com.example.bank.account.entity.BankAccount;
import com.example.bank.account.repository.BankAccountRepository;
import com.example.bank.admin.dto.AdminAlertResponse;
import com.example.bank.admin.dto.AdminAnalyticsResponse;
import com.example.bank.admin.dto.AdminDailyMetricResponse;
import com.example.bank.card.entity.BankCard;
import com.example.bank.card.entity.CardStatus;
import com.example.bank.card.repository.BankCardRepository;
import com.example.bank.customer.entity.Customer;
import com.example.bank.customer.entity.Role;
import com.example.bank.customer.repository.CustomerRepository;
import com.example.bank.deposit.entity.Deposit;
import com.example.bank.deposit.repository.DepositRepository;
import com.example.bank.fraud.entity.FraudReviewStatus;
import com.example.bank.fraud.service.FraudTransactionService;
import com.example.bank.loan.entity.LoanApplication;
import com.example.bank.loan.entity.LoanApplicationStatus;
import com.example.bank.loan.repository.LoanApplicationRepository;
import com.example.bank.transaction.entity.BankTransaction;
import com.example.bank.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminAnalyticsService {
    private final CustomerRepository customerRepository;
    private final BankAccountRepository accountRepository;
    private final BankCardRepository cardRepository;
    private final TransactionRepository transactionRepository;
    private final LoanApplicationRepository loanRepository;
    private final DepositRepository depositRepository;
    private final FraudTransactionService fraudTransactionService;

    @Transactional(readOnly = true)
    public AdminAnalyticsResponse analytics() {
        List<Customer> customers = customerRepository.findAll();
        List<BankAccount> accounts = accountRepository.findAll();
        List<BankCard> cards = cardRepository.findAll();
        List<BankTransaction> transactions = transactionRepository.findAllByOrderByCreatedAtDesc();
        List<LoanApplication> loans = loanRepository.findAll();
        List<Deposit> deposits = depositRepository.findAll();
        var fraudTransactions = fraudTransactionService.all();
        LocalDate today = LocalDate.now();

        Map<String, Long> usersByRole = customers.stream()
                .flatMap(customer -> customer.getRoles().stream().map(Role::getName))
                .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));
        Map<String, Long> transactionsByType = transactions.stream()
                .collect(Collectors.groupingBy(transaction -> transaction.getType().name(), LinkedHashMap::new, Collectors.counting()));

        List<AdminDailyMetricResponse> dailyMetrics = today.minusDays(6).datesUntil(today.plusDays(1))
                .map(date -> new AdminDailyMetricResponse(
                        date,
                        transactions.stream().filter(transaction -> transaction.getCreatedAt().toLocalDate().equals(date)).count(),
                        transactions.stream()
                                .filter(transaction -> transaction.getCreatedAt().toLocalDate().equals(date))
                                .map(BankTransaction::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                ))
                .toList();

        long totalAdmins = customers.stream().filter(customer -> hasRole(customer, "ADMIN")).count();
        long activeCards = cards.stream().filter(card -> card.getStatus() == CardStatus.ACTIVE).count();
        long blockedCards = cards.stream().filter(card -> card.getStatus() == CardStatus.BLOCKED).count();
        long pendingLoans = loans.stream().filter(loan -> loan.getStatus() == LoanApplicationStatus.PENDING).count();
        long activeDeposits = deposits.stream().filter(deposit -> Boolean.TRUE.equals(deposit.getActive())).count();
        long suspiciousTransactions = fraudTransactions.stream().filter(item -> item.suspicious() || item.status() == FraudReviewStatus.SUSPICIOUS).count();
        long newFraudReviews = fraudTransactions.stream().filter(item -> item.status() == FraudReviewStatus.NEW).count();
        long reviewedFraudTransactions = fraudTransactions.size() - newFraudReviews;
        BigDecimal totalTransactionVolume = sum(transactions, BankTransaction::getAmount);
        BigDecimal transactionVolumeToday = sum(
                transactions.stream().filter(transaction -> transaction.getCreatedAt().toLocalDate().equals(today)).toList(),
                BankTransaction::getAmount
        );

        return new AdminAnalyticsResponse(
                customers.size(),
                totalAdmins,
                accounts.size(),
                sum(accounts, BankAccount::getBalance),
                cards.size(),
                activeCards,
                blockedCards,
                transactions.size(),
                totalTransactionVolume,
                transactions.stream().filter(transaction -> transaction.getCreatedAt().toLocalDate().equals(today)).count(),
                transactionVolumeToday,
                pendingLoans,
                sum(loans, LoanApplication::getAmount),
                activeDeposits,
                sum(deposits.stream().filter(deposit -> Boolean.TRUE.equals(deposit.getActive())).toList(), Deposit::getPrincipal),
                suspiciousTransactions,
                newFraudReviews,
                reviewedFraudTransactions,
                usersByRole,
                transactionsByType,
                dailyMetrics,
                buildAlerts(totalAdmins, pendingLoans, suspiciousTransactions, newFraudReviews, blockedCards)
        );
    }

    private List<AdminAlertResponse> buildAlerts(long totalAdmins, long pendingLoans, long suspiciousTransactions, long newFraudReviews, long blockedCards) {
        List<AdminAlertResponse> alerts = new ArrayList<>();
        if (totalAdmins < 2) {
            alerts.add(new AdminAlertResponse("high", "Нужен резервный администратор", "В системе меньше двух администраторов. Создайте второго администратора для непрерывности управления.", "Создать администратора"));
        }
        if (newFraudReviews > 0) {
            alerts.add(new AdminAlertResponse("high", "Есть непроверенные антифрод-события", "Новые операции в мониторинге требуют решения SAFE/SUSPICIOUS.", "Открыть мониторинг"));
        }
        if (suspiciousTransactions > 0) {
            alerts.add(new AdminAlertResponse("medium", "Повышенный риск операций", "Часть операций помечена антифродом как подозрительная или подтверждена администратором.", "Проверить операции"));
        }
        if (pendingLoans > 0) {
            alerts.add(new AdminAlertResponse("medium", "Кредитные заявки ожидают решения", "Проверьте очередь заявок и SLA обработки клиентских обращений.", "Открыть заявки"));
        }
        if (blockedCards > 0) {
            alerts.add(new AdminAlertResponse("low", "Есть заблокированные карты", "Проверьте причины блокировок и обращения клиентов.", "Посмотреть карты"));
        }
        if (alerts.isEmpty()) {
            alerts.add(new AdminAlertResponse("low", "Система работает штатно", "Критичных отклонений по пользователям, операциям и продуктам не обнаружено.", "Продолжить мониторинг"));
        }
        return alerts;
    }

    private boolean hasRole(Customer customer, String role) {
        return customer.getRoles().stream().anyMatch(item -> item.getName().equals(role));
    }

    private <T> BigDecimal sum(List<T> items, Function<T, BigDecimal> mapper) {
        return items.stream().map(mapper).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
