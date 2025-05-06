export type TransactionType = 'D' | 'W' | 'I';

export interface Transaction {
    date: string; // YYYYMMDD format
    accountId: string;
    type: TransactionType;
    amount: number;
    transactionId: string; // YYYYMMDD-XX format
}

export interface Account {
    id: string;
    transactions: Transaction[];
}

export interface AccountStatement {
    accountId: string;
    transactions: Transaction[];
    openingBalance: number;
}

export interface InterestRule {
    date: string; // YYYYMMDD format
    ruleId: string;
    rate: number; // percentage
}