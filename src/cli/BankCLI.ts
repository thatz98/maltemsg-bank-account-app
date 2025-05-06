import * as readline from 'readline';
import { AccountStatement, InterestRule, Transaction } from '../models/types';
import { BankAccountService } from '../services/BankAccountService';

export class BankCLI {
    private rl: readline.Interface;
    private bankAccountService: BankAccountService;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.bankAccountService = new BankAccountService();
    }

    public start(): void {
        this.showMainMenu(true);
    }

    private showMainMenu(isFirstTime: boolean = false): void {
        if (isFirstTime) {
            console.log('\nWelcome to AwesomeGIC Bank! What would you like to do?');
        } else {
            console.log('\nIs there anything else you\'d like to do?');
        }
        this.displayMainMenuOptions();
        this.rl.question('> ', (answer) => {
            const choice = answer.trim().toUpperCase();
            switch (choice) {
                case 'T':
                    this.showTransactionMenu();
                    break;
                case 'I':
                    this.showInterestRuleMenu();
                    break;
                case 'P':
                    this.showPrintStatementMenu();
                    break;
                case 'Q':
                    this.quit();
                    break;
                default:
                    console.log('Invalid choice. Please try again.');
                    this.showMainMenu();
            }
        });
    }

    private displayMainMenuOptions(): void {
        console.log('[T] Input transactions');
        console.log('[I] Define interest rules');
        console.log('[P] Print statement');
        console.log('[Q] Quit');
    }



    private showTransactionMenu(): void {
        console.log('\nPlease enter transaction details in <Date in YYYYMMDD> <Account> <Type> <Amount> format (or enter blank to go back to main menu):');

        this.rl.question('> ', (input) => {
            if (!input.trim()) {
                this.showMainMenu(true);
                return;
            }

            try {
                const [date, account, type, amount] = input.trim().split(' ');
                const transactionType = type.toUpperCase() as 'D' | 'W';

                const validationError = this.validateTransactionInput(date, account, transactionType, amount);
                if (validationError) {
                    throw new Error(validationError);
                }

                this.bankAccountService.processTransaction(
                    date,
                    account,
                    transactionType,
                    parseFloat(amount)
                );

                this.displayAccountTransactions(account);
                this.showMainMenu();
            } catch (error: unknown) {
                console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                this.showTransactionMenu();
            }
        });
    }

    private showInterestRuleMenu(): void {
        console.log('\nPlease enter interest rules details in <Date in YYYYMMDD> <RuleId> <Rate in %> format (or enter blank to go back to main menu):');

        this.rl.question('> ', (input) => {
            if (!input.trim()) {
                this.showMainMenu(true);
                return;
            }

            try {
                const [date, ruleId, rate] = input.trim().split(' ');

                const validationError = this.validateInterestRuleInput(date, ruleId, rate);
                if (validationError) {
                    throw new Error(validationError);
                }

                this.bankAccountService.addInterestRule(date, ruleId, parseFloat(rate));
                this.displayInterestRules();
                this.showMainMenu();
            } catch (error: unknown) {
                console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                this.showInterestRuleMenu();
            }
        });
    }

    private showPrintStatementMenu(): void {
        console.log('\nPlease enter account and month to generate the statement <Account> <Year><Month> (or enter blank to go back to main menu):');

        this.rl.question('> ', (input) => {
            if (!input.trim()) {
                this.showMainMenu(true);
                return;
            }

            try {
                const [account, yearMonth] = input.trim().split(' ');
                const year = parseInt(yearMonth.substring(0, 4));
                const month = parseInt(yearMonth.substring(4, 6));

                const validationError = this.validatePrintStatementInput(account, year, month);
                if (validationError) {
                    throw new Error(validationError);
                }

                const statement = this.bankAccountService.getAccountStatement(account, year, month);
                this.displayAccountStatement(statement);
                this.showMainMenu();
            } catch (error: unknown) {
                console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                this.showPrintStatementMenu();
            }
        });
    }

    private displayAccountTransactions(accountId: string): void {
        console.log(`\nAccount: ${accountId}`);

        const account = this.bankAccountService.getAccountStatement(accountId);

        const widths = {
            date: 8, // Fixed width for date (YYYYMMDD)
            txnId: Math.max(10, ...account.transactions.map(t => (t.transactionId || '').length)),
            type: 4, // Fixed width for type (D/W/I)
            amount: Math.max(8, ...account.transactions.map(t => t.amount.toFixed(2).length)),
        };

        const header = [
            'Date'.padEnd(widths.date),
            'Txn Id'.padEnd(widths.txnId),
            'Type'.padEnd(widths.type),
            'Amount'.padEnd(widths.amount)
        ].join(' | ');

        const separator = [
            '-'.repeat(widths.date),
            '-'.repeat(widths.txnId),
            '-'.repeat(widths.type),
            '-'.repeat(widths.amount)
        ].join('-|-');

        console.log(`| ${header} |`);
        console.log(`|-${separator}-|`);

        account.transactions.forEach((t: Transaction) => {
            const row = [
                t.date,
                (t.transactionId || '').padEnd(widths.txnId),
                t.type.padEnd(widths.type),
                t.amount.toFixed(2).padStart(widths.amount)
            ].join(' | ');

            console.log(`| ${row} |`);
        });
    }

    private displayInterestRules(): void {
        console.log('\nInterest rules:');

        const rules = this.bankAccountService.getInterestRules();

        const widths = {
            date: 8,
            ruleId: Math.max(6, ...rules.map((r: InterestRule) => r.ruleId.length)),
            rate: 8
        };

        const header = [
            'Date'.padEnd(widths.date),
            'RuleId'.padEnd(widths.ruleId),
            'Rate (%)'.padEnd(widths.rate)
        ].join(' | ');

        const separator = [
            '-'.repeat(widths.date),
            '-'.repeat(widths.ruleId),
            '-'.repeat(widths.rate)
        ].join('-|-');

        console.log(`| ${header} |`);
        console.log(`|-${separator}-|`);

        rules.forEach((rule: InterestRule) => {
            const row = [
                rule.date,
                rule.ruleId.padEnd(widths.ruleId),
                rule.rate.toFixed(2).padStart(widths.rate)
            ].join(' | ');

            console.log(`| ${row} |`);
        });
    }

    private displayAccountStatement(statement: AccountStatement): void {
        console.log(`\nAccount: ${statement.accountId}`);

        const widths = {
            date: 8,
            txnId: Math.max(10, ...statement.transactions.map(t => (t.transactionId || '').length)),
            type: 4,
            amount: Math.max(8, ...statement.transactions.map(t => t.amount.toFixed(2).length)),
            balance: Math.max(7, ...statement.transactions.map(t => t.amount.toFixed(2).length))
        };

        const header = [
            'Date'.padEnd(widths.date),
            'Txn Id'.padEnd(widths.txnId),
            'Type'.padEnd(widths.type),
            'Amount'.padEnd(widths.amount),
            'Balance'.padEnd(widths.balance)
        ].join(' | ');

        const separator = [
            '-'.repeat(widths.date),
            '-'.repeat(widths.txnId),
            '-'.repeat(widths.type),
            '-'.repeat(widths.amount),
            '-'.repeat(widths.balance)
        ].join('-|-');

        console.log(`| ${header} |`);
        console.log(`|-${separator}-|`);

        let runningBalance = statement.openingBalance;

        statement.transactions.forEach((t: Transaction) => {
            runningBalance += t.type === 'D' || t.type === 'I' ? t.amount : -t.amount;

            const row = [
                t.date,
                (t.transactionId || '').padEnd(widths.txnId),
                t.type.padEnd(widths.type),
                t.amount.toFixed(2).padStart(widths.amount),
                runningBalance.toFixed(2).padStart(widths.balance)
            ].join(' | ');

            console.log(`| ${row} |`);
        });
    }

    private quit(): void {
        console.log('\nThank you for banking with AwesomeGIC Bank.');
        console.log('Have a nice day!');
        this.rl.close();
    }

    private validateFutureDate(date: Date): boolean {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date <= today;
    }

    private validateTransactionInput(date: string, account: string, type: string, amount: string): string | null {
        const dateRegex = /^\d{8}$/;
        const amountRegex = /^\d+(\.\d{1,2})?$/;

        if (!dateRegex.test(date) ||
            account.length === 0 ||
            !['D', 'W'].includes(type) ||
            !amountRegex.test(amount) ||
            parseFloat(amount) <= 0) {
            return 'Invalid input format';
        }

        // Check if date is not in the future
        const inputDate = new Date(
            parseInt(date.substring(0, 4)),
            parseInt(date.substring(4, 6)) - 1,
            parseInt(date.substring(6, 8))
        );

        if (!this.validateFutureDate(inputDate)) {
            return 'Date should not be in the future';
        }

        return null;
    }

    private validateInterestRuleInput(date: string, ruleId: string, rate: string): string | null {
        const dateRegex = /^\d{8}$/;
        const rateRegex = /^\d+(\.\d{1,2})?$/;

        if (!dateRegex.test(date) ||
            ruleId.length === 0 ||
            !rateRegex.test(rate) ||
            parseFloat(rate) <= 0 ||
            parseFloat(rate) >= 100) {
            return 'Invalid input format';
        }

        // Check if date is not in the future
        const inputDate = new Date(
            parseInt(date.substring(0, 4)),
            parseInt(date.substring(4, 6)) - 1,
            parseInt(date.substring(6, 8))
        );

        if (!this.validateFutureDate(inputDate)) {
            return 'Date should not be in the future';
        }

        return null;
    }

    private validatePrintStatementInput(account: string, year: number, month: number): string | null {
        if (account.length === 0 ||
            year < 1900 ||
            year > 2100 ||
            month < 1 ||
            month > 12) {
            return 'Invalid input format';
        }

        // Check if the requested month is not in the future
        const inputDate = new Date(year, month - 1, 1);
        inputDate.setDate(1); // Set to first day of month for comparison

        if (!this.validateFutureDate(inputDate)) {
            return 'Date should not be in the future';
        }

        return null;
    }
} 