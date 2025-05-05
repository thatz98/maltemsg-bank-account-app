import * as readline from 'readline';
import { Transaction } from '../models/types';
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

                if (!this.validateTransactionInput(date, account, transactionType, amount)) {
                    throw new Error('Invalid input format');
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
        });
    }

    private showPrintStatementMenu(): void {
        console.log('\nPlease enter account and month to generate the statement <Account> <Year><Month> (or enter blank to go back to main menu):');

        this.rl.question('> ', (input) => {
            if (!input.trim()) {
                this.showMainMenu(true);
                return;
            }
        });
    }

    private displayAccountTransactions(accountId: string): void {
        console.log(`\nAccount: ${accountId}`);

        const account = this.bankAccountService.getAccountStatement(accountId, new Date().getFullYear(), new Date().getMonth() + 1);

        const widths = {
            date: 8, // Fixed width for date (YYYYMMDD)
            txnId: Math.max(10, ...account.transactions.map(t => (t.transactionId || '').length)),
            type: 4, // Fixed width for type (D/W/I)
            amount: 8 // Fixed width for amount (uses only 2 decimal places)
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

    private quit(): void {
        console.log('\nThank you for banking with AwesomeGIC Bank.');
        console.log('Have a nice day!');
        this.rl.close();
    }

    private validateTransactionInput(date: string, account: string, type: string, amount: string): boolean {
        const dateRegex = /^\d{8}$/;
        const amountRegex = /^\d+(\.\d{1,2})?$/;

        return dateRegex.test(date) &&
            account.length > 0 &&
            ['D', 'W'].includes(type) &&
            amountRegex.test(amount) &&
            parseFloat(amount) > 0;
    }
} 