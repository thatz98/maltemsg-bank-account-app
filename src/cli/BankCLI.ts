import * as readline from 'readline';

export class BankCLI {
    private rl: readline.Interface;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
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
        console.log('\nPlease enter transaction details in <Date(YYYYMMDD)> <Account> <Type> <Amount> format (or enter blank to go back to main menu):');

        this.rl.question('> ', (input) => {
            if (!input.trim()) {
                this.showMainMenu(true);
                return;
            }
        });
    }

    private showInterestRuleMenu(): void {
        console.log('\nPlease enter interest rules details in <Date(YYYYMMDD)> <RuleId> <Rate in %> format (or enter blank to go back to main menu):');

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

    private quit(): void {
        console.log('\nThank you for banking with AwesomeGIC Bank.');
        console.log('Have a nice day!');
        this.rl.close();
    }
} 