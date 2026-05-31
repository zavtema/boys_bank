export type Role = 'USER' | 'ADMIN' | 'CLIENT';
export type AccountType = 'CURRENT' | 'SAVINGS' | 'DONATION';
export type TransactionType = 'TRANSFER' | 'DONATION' | 'DEPOSIT_OPEN' | 'ADJUSTMENT';

export interface AuthResponse { token: string; tokenType: string; expiresInSeconds: number }
export interface User {
  id: number; firstName: string; lastName: string; email: string; roles: Role[]; createdAt: string;
  phone?: string | null; city?: string | null; addressLine?: string | null; passportNumber?: string | null; passportIssuedBy?: string | null;
  employer?: string | null; jobTitle?: string | null; monthlyIncome?: number | null; twoFactorEnabled?: boolean; pushNotifications?: boolean; marketingNotifications?: boolean;
}
export interface Account { id: number; iban: string; type: AccountType; balance: number; currency: string; active: boolean; productName?: string; packageName?: string; monthlyTransfersLimit?: number }
export interface Transaction { id: number; fromAccountId: number | null; toAccountId: number | null; amount: number; type: TransactionType; operationId: string; createdAt: string; description?: string | null }
export interface Card { id: number; accountId: number; maskedNumber: string; expiresAt: string; status: 'ACTIVE' | 'BLOCKED'; tier?: 'BLACK' | 'PLATINUM' | 'GOLD' | string; displayName?: string; cashbackRate?: number; monthlyFee?: number; dailyLimit?: number }
export interface Loan { id: number; amount: number; termMonths: number; annualRate: number; purpose?: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; createdAt: string }
export interface Deposit { id: number; accountId: number; principal: number; annualRate: number; termMonths: number; openedAt: string; maturityDate: string; projectedPayout: number; active: boolean; productName?: string; capitalization?: boolean; earlyWithdrawal?: boolean }
export interface FraudCheck { suspicious: boolean; riskScore: number; reason: string; source: string }
export interface FraudTransaction { id: number; transaction: Transaction; suspicious: boolean; riskScore: number; reason: string; source: string; status: 'NEW' | 'SAFE' | 'SUSPICIOUS'; reviewerNote?: string | null }
export interface MonthlyAnalytics { month: string; outgoingOperations: number; outgoingTotal: number; incomingOperations: number; incomingTotal: number }

export interface AdminDailyMetric { date: string; operations: number; volume: number }
export interface AdminAlert { severity: 'low' | 'medium' | 'high' | string; title: string; description: string; actionLabel: string }
export interface AdminAnalytics {
  totalUsers: number; totalAdmins: number; totalAccounts: number; totalBalance: number; totalCards: number; activeCards: number; blockedCards: number;
  totalTransactions: number; totalTransactionVolume: number; transactionsToday: number; transactionVolumeToday: number; pendingLoans: number; loanPortfolio: number;
  activeDeposits: number; depositPortfolio: number; suspiciousTransactions: number; newFraudReviews: number; reviewedFraudTransactions: number;
  usersByRole: Record<string, number>; transactionsByType: Record<string, number>; dailyMetrics: AdminDailyMetric[]; alerts: AdminAlert[];
}

export interface CreditEstimate { requestedAmount: number; termMonths: number; annualRate: number; monthlyPayment: number; totalPayment: number; overpayment: number }
export interface DepositEstimate { amount: number; termMonths: number; annualRate: number; maturityDate: string; projectedPayout: number; income: number }

export interface DonationCampaign { id: number; title: string; description: string; category?: string | null; sourceUrl?: string | null; impact?: string | null; targetAccountId: number; collectedAmount: number; active: boolean }
