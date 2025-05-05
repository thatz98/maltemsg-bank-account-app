import { Account, AccountStatement, Transaction, TransactionType } from '../models/types';
import { LoggingService } from './LoggingService';

export class BankAccountService {
    private accounts: Map<string, Account> = new Map();
    private logger: LoggingService;

    constructor() {
        this.logger = new LoggingService('bank-account-service.log');
    }

    public processTransaction(date: string, accountId: string, type: TransactionType, amount: number): Transaction {
        this.logger.info(`Processing transaction: ${date} ${accountId} ${type} ${amount}`);

        if (amount <= 0) {
            this.logger.error(`Amount must be greater than 0: ${amount}`);
            throw new Error('Amount must be greater than 0');
        }

        let account = this.accounts.get(accountId);
        if (!account) {
            this.logger.info(`Creating new account: ${accountId}`);
            if (type === 'W') {
                this.logger.error(`Cannot withdraw from a new account: ${accountId}`);
                throw new Error('Cannot withdraw from a new account');
            }
            account = { id: accountId, balance: 0, transactions: [] };
            this.accounts.set(accountId, account);
        }

        if (type === 'W' && account.balance < amount) {
            this.logger.error(`Insufficient balance: ${account.balance} < ${amount}`);
            throw new Error('Insufficient balance');
        }

        const transactionId = this.generateTransactionId(date, account);
        const transaction: Transaction = {
            date,
            accountId,
            type,
            amount,
            transactionId
        };

        account.transactions.push(transaction);
        account.balance += type === 'D' ? amount : -amount;
        this.logger.info(`Transaction processed. New balance: ${account.balance}`);

        return transaction;
    }

    public getAccountStatement(accountId: string, year?: number, month?: number): AccountStatement {
        const account = this.accounts.get(accountId);
        if (!account) {
            this.logger.error(`Account not found: ${accountId}`);
            throw new Error('Account not found');
        }

        let transactions = account.transactions;

        if (year !== undefined && month !== undefined) {
            const startDate = `${year}${month.toString().padStart(2, '0')}01`;
            const endDate = `${year}${month.toString().padStart(2, '0')}${new Date(year, month, 0).getDate()}`;

            transactions = account.transactions
                .filter(t => t.date >= startDate && t.date <= endDate);
        }

        transactions.sort((a, b) => a.date.localeCompare(b.date));

        return {
            accountId,
            transactions,
            balance: account.balance
        };
    }

    private generateTransactionId(date: string, account: Account): string {
        const dayTransactions = account.transactions.filter(t => t.date === date);
        const sequenceNumber = (dayTransactions.length + 1).toString().padStart(2, '0');
        return `${date}-${sequenceNumber}`;
    }
} 