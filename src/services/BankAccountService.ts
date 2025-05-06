import { Account, AccountStatement, InterestRule, Transaction, TransactionType } from '../models/types';
import { LoggingService } from './LoggingService';

export class BankAccountService {
    private accounts: Map<string, Account> = new Map();
    private interestRules: InterestRule[] = [];
    private logger: LoggingService;

    constructor() {
        this.logger = new LoggingService('bank-account-service.log');
    }

    private getCurrentBalance(account: Account, date: string): number {
        const year = parseInt(date.substring(0, 4));
        const month = parseInt(date.substring(4, 6));

        // Get the opening balance for the month
        let balance = this.getMonthlyOpeningBalance(account, year, month);

        // Get transactions for the current month up to the given date
        const monthStartDate = `${year}${month.toString().padStart(2, '0')}01`;
        const transactions = account.transactions
            .filter(t => t.date >= monthStartDate && t.date <= date)
            .sort((a, b) => a.date.localeCompare(b.date));

        transactions.forEach(t => {
            balance += t.type === 'D' ? t.amount : -t.amount;
        });

        return balance;
    }

    private getMonthlyOpeningBalance(account: Account, year: number, month: number): number {
        // Get the first transaction date to know where to start
        const sortedTransactions = [...account.transactions].sort((a, b) => a.date.localeCompare(b.date));
        const firstTransaction = sortedTransactions[0];
        if (!firstTransaction) {
            return 0;
        }

        let balance = 0;
        let currentDate = new Date(
            parseInt(firstTransaction.date.substring(0, 4)),
            parseInt(firstTransaction.date.substring(4, 6)) - 1,
            1
        );

        // Process each month up to the target date
        while (currentDate < new Date(year, month - 1, 1)) {
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;
            const monthStartDate = `${currentYear}${currentMonth.toString().padStart(2, '0')}01`;
            const monthEndDate = `${currentYear}${currentMonth.toString().padStart(2, '0')}${new Date(currentYear, currentMonth, 0).getDate()}`;

            // Get transactions for this month
            const monthTransactions = sortedTransactions
                .filter(t => t.date >= monthStartDate && t.date <= monthEndDate);

            let openingBalance = balance;

            // Process transactions for this month
            monthTransactions.forEach(t => {
                balance += t.type === 'D' ? t.amount : -t.amount;
            });

            // Calculate interest for this month using the opening balance
            const interest = this.calculateInterest(account.id, currentYear, currentMonth, openingBalance);
            if (interest > 0) {
                balance += interest;
            }

            // Move to next month
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        return balance;
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
            account = { id: accountId, transactions: [] };
            this.accounts.set(accountId, account);
        }

        // Calculate current balance for validation
        const currentBalance = this.getCurrentBalance(account, date);

        if (type === 'W' && currentBalance < amount) {
            this.logger.error(`Insufficient balance: ${currentBalance} < ${amount}`);
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
        this.logger.info(`Transaction processed. New balance: ${currentBalance + (type === 'D' ? amount : -amount)}`);

        return transaction;
    }

    public getRecentTransactions(accountId: string, count: number = 10): AccountStatement {
        const account = this.accounts.get(accountId);
        if (!account) {
            this.logger.error(`Account not found: ${accountId}`);
            throw new Error('Account not found');
        }

        const sortedTransactions = [...account.transactions].sort((a, b) => b.date.localeCompare(a.date));
        const lastNTransactions = sortedTransactions.slice(0, count);

        const transactions = lastNTransactions.sort((a, b) => a.date.localeCompare(b.date));

        return {
            accountId,
            transactions,
            openingBalance: 0
        };
    }

    public getMonthlyStatement(accountId: string, year: number, month: number): AccountStatement {
        const account = this.accounts.get(accountId);
        if (!account) {
            this.logger.error(`Account not found: ${accountId}`);
            throw new Error('Account not found');
        }

        const startDate = `${year}${month.toString().padStart(2, '0')}01`;
        const endDate = `${year}${month.toString().padStart(2, '0')}${new Date(year, month, 0).getDate()}`;

        // Get the opening balance (end of previous day)
        const openingBalance = this.getMonthlyOpeningBalance(account, year, month);

        let transactions = account.transactions
            .filter(t => t.date >= startDate && t.date <= endDate)
            .sort((a, b) => a.date.localeCompare(b.date));

        // Only calculate and add interest if it's not the current month
        const currentDate = new Date();
        const isCurrentMonth = year === currentDate.getFullYear() && month === currentDate.getMonth() + 1;

        if (!isCurrentMonth) {
            const interest = this.calculateInterest(accountId, year, month, openingBalance);
            if (interest > 0) {
                const interestTransaction: Transaction = {
                    date: endDate,
                    accountId,
                    type: 'I',
                    amount: interest,
                    transactionId: ''
                };
                transactions.push(interestTransaction);
            }
        }

        return {
            accountId,
            transactions,
            openingBalance
        };
    }

    public getAccountStatement(accountId: string, year?: number, month?: number): AccountStatement {
        if (year !== undefined && month !== undefined) {
            return this.getMonthlyStatement(accountId, year, month);
        }
        return this.getRecentTransactions(accountId);
    }

    public addInterestRule(date: string, ruleId: string, rate: number): void {
        this.logger.info(`Adding interest rule: ${date} ${ruleId} ${rate}%`);

        if (rate <= 0 || rate >= 100) {
            this.logger.error(`Interest rate must be between 0 and 100: ${rate}`);
            throw new Error('Interest rate must be between 0 and 100');
        }

        // Remove any existing rule for the same date
        this.interestRules = this.interestRules.filter(rule => rule.date !== date);

        this.interestRules.push({ date, ruleId, rate });
        this.interestRules.sort((a, b) => a.date.localeCompare(b.date));
        this.logger.info(`Current interest rules: ${JSON.stringify(this.interestRules)}`);
    }

    public getInterestRules(): InterestRule[] {
        return [...this.interestRules];
    }

    private generateTransactionId(date: string, account: Account): string {
        const dayTransactions = account.transactions.filter(t => t.date === date);
        const sequenceNumber = (dayTransactions.length + 1).toString().padStart(2, '0');
        return `${date}-${sequenceNumber}`;
    }

    public calculateInterest(accountId: string, year: number, month: number, openingBalance: number): number {
        this.logger.info(`Calculating interest for account ${accountId} for ${year}-${month}`);

        const account = this.accounts.get(accountId);
        if (!account) {
            this.logger.error(`Account not found: ${accountId}`);
            throw new Error('Account not found');
        }

        const startDate = `${year}${month.toString().padStart(2, '0')}01`;
        const endDate = `${year}${month.toString().padStart(2, '0')}${new Date(year, month, 0).getDate()}`;
        this.logger.info(`Period: ${startDate} to ${endDate}`);

        let currentBalance = openingBalance;
        let totalInterest = 0;
        let currentDate = startDate;

        // Get all transactions for the month
        const monthTransactions = account.transactions
            .filter(t => t.date >= startDate && t.date <= endDate)
            .sort((a, b) => a.date.localeCompare(b.date));
        this.logger.info(`Found ${monthTransactions.length} transactions for the period`);

        // Calculate daily balances and apply interest rules
        while (currentDate <= endDate) {
            // Update balance for the day
            const dayTransactions = monthTransactions.filter(t => t.date === currentDate);
            dayTransactions.forEach(t => {
                currentBalance += t.type === 'D' ? t.amount : -t.amount;
            });

            // Get applicable interest rate for the day
            const applicableRule = this.interestRules
                .filter(rule => rule.date <= currentDate)
                .pop();

            if (applicableRule) {
                const dailyRate = applicableRule.rate / 36500; // Convert annual rate to daily rate
                const dailyInterest = currentBalance * dailyRate;
                totalInterest += dailyInterest;
                this.logger.info(`Day ${currentDate}: Balance=${currentBalance}, Rate=${applicableRule.rate}%, Interest=${dailyInterest.toFixed(4)}`);
            }

            // Move to next day
            const currentYear = parseInt(currentDate.substring(0, 4));
            const currentMonth = parseInt(currentDate.substring(4, 6));
            const currentDay = parseInt(currentDate.substring(6, 8));

            const nextDate = new Date(currentYear, currentMonth - 1, currentDay + 1);
            currentDate = `${nextDate.getFullYear()}${(nextDate.getMonth() + 1).toString().padStart(2, '0')}${nextDate.getDate().toString().padStart(2, '0')}`;
        }

        // Round to 2 decimal places
        const roundedInterest = Math.round(totalInterest * 100) / 100;
        this.logger.info(`Total interest for period: ${roundedInterest}`);
        return roundedInterest;
    }
}