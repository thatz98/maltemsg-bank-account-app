import { BankAccountService } from './BankAccountService';

describe('BankAccountService', () => {
    let bankAccountService: BankAccountService;

    beforeEach(() => {
        bankAccountService = new BankAccountService();
    });

    describe('processTransaction', () => {
        it('should create a new account with initial deposit', () => {
            const transaction = bankAccountService.processTransaction('20230601', 'AC001', 'D', 100.00);
            expect(transaction).toEqual({
                date: '20230601',
                accountId: 'AC001',
                type: 'D',
                amount: 100.00,
                transactionId: '20230601-01'
            });
        });

        it('should throw error when withdrawing from new account', () => {
            expect(() => {
                bankAccountService.processTransaction('20230601', 'AC001', 'W', 100.00);
            }).toThrow('Cannot withdraw from a new account');
        });

        it('should throw error when withdrawing more than balance', () => {
            bankAccountService.processTransaction('20230601', 'AC001', 'D', 100.00);
            expect(() => {
                bankAccountService.processTransaction('20230601', 'AC001', 'W', 200.00);
            }).toThrow('Insufficient balance');
        });

        it('should generate sequential transaction IDs for same day', () => {
            bankAccountService.processTransaction('20230601', 'AC001', 'D', 100.00);
            const transaction2 = bankAccountService.processTransaction('20230601', 'AC001', 'D', 50.00);
            expect(transaction2.transactionId).toBe('20230601-02');
        });

        it('should throw error for zero amount', () => {
            expect(() => {
                bankAccountService.processTransaction('20230601', 'AC001', 'D', 0);
            }).toThrow('Amount must be greater than 0');
        });

        it('should throw error for negative amount', () => {
            expect(() => {
                bankAccountService.processTransaction('20230601', 'AC001', 'D', -100);
            }).toThrow('Amount must be greater than 0');
        });
    });

    describe('getAccountStatement', () => {
        it('should generate correct account statement with interest', () => {
            bankAccountService.processTransaction('20230510', 'AC001', 'D', 750.00);
            bankAccountService.processTransaction('20230601', 'AC001', 'D', 1000.00);
            bankAccountService.processTransaction('20230615', 'AC001', 'W', 500.00);

            const statement = bankAccountService.getAccountStatement('AC001', 2023, 6);

            expect(statement.accountId).toBe('AC001');
            expect(statement.transactions.length).toBe(2);
            expect(statement.openingBalance).toBe(750.00);
        });

        it('should return recent transactions when no month/year specified', () => {
            bankAccountService.processTransaction('20230601', 'AC001', 'D', 100.00);
            bankAccountService.processTransaction('20230602', 'AC001', 'D', 200.00);
            bankAccountService.processTransaction('20230603', 'AC001', 'D', 300.00);

            const statement = bankAccountService.getAccountStatement('AC001');

            expect(statement.accountId).toBe('AC001');
            expect(statement.transactions.length).toBe(3);
            expect(statement.openingBalance).toBe(0);
        });

        it('should calculate interest correctly for a month', () => {
            bankAccountService.addInterestRule('20230601', 'RULE01', 2.0);
            bankAccountService.processTransaction('20230601', 'AC001', 'D', 1000.00);

            const statement = bankAccountService.getAccountStatement('AC001', 2023, 6);
            const interestTransaction = statement.transactions.find(t => t.type === 'I');

            expect(interestTransaction).toBeDefined();
            expect(interestTransaction?.amount).toBeGreaterThan(0);
        });

        it('should apply different interest rates based on rule dates', () => {
            bankAccountService.addInterestRule('20230601', 'RULE01', 2.0);
            bankAccountService.addInterestRule('20230615', 'RULE02', 3.0);
            bankAccountService.processTransaction('20230601', 'AC001', 'D', 1000.00);

            const statement = bankAccountService.getAccountStatement('AC001', 2023, 6);
            const interestTransaction = statement.transactions.find(t => t.type === 'I');

            expect(interestTransaction).toBeDefined();
            expect(interestTransaction?.amount).toBeGreaterThan(0);
        });

        it('should include previous month interest in opening balance', () => {
            // Add interest rule for May
            bankAccountService.addInterestRule('20230501', 'RULE01', 2.0);

            // Create initial deposit in May
            bankAccountService.processTransaction('20230501', 'AC001', 'D', 1000.00);

            // Get May statement to verify interest
            const mayStatement = bankAccountService.getAccountStatement('AC001', 2023, 5);
            const mayInterest = mayStatement.transactions.find(t => t.type === 'I');
            expect(mayInterest).toBeDefined();
            const mayInterestAmount = mayInterest?.amount || 0;

            // Get June statement and verify opening balance includes May's interest
            const juneStatement = bankAccountService.getAccountStatement('AC001', 2023, 6);
            expect(juneStatement.openingBalance).toBe(1000.00 + mayInterestAmount);
        });

        it('should accumulate interest across multiple months', () => {
            // Add interest rules for multiple months
            bankAccountService.addInterestRule('20230401', 'RULE01', 2.0);
            bankAccountService.addInterestRule('20230501', 'RULE02', 2.5);
            bankAccountService.addInterestRule('20230601', 'RULE03', 3.0);

            // Create initial deposit in April
            bankAccountService.processTransaction('20230401', 'AC001', 'D', 1000.00);

            // Get April statement
            const aprilStatement = bankAccountService.getAccountStatement('AC001', 2023, 4);
            const aprilInterest = aprilStatement.transactions.find(t => t.type === 'I');
            const aprilInterestAmount = aprilInterest?.amount || 0;

            // Get May statement
            const mayStatement = bankAccountService.getAccountStatement('AC001', 2023, 5);
            const mayInterest = mayStatement.transactions.find(t => t.type === 'I');
            const mayInterestAmount = mayInterest?.amount || 0;

            // Get June statement
            const juneStatement = bankAccountService.getAccountStatement('AC001', 2023, 6);
            const juneInterest = juneStatement.transactions.find(t => t.type === 'I');
            const juneInterestAmount = juneInterest?.amount || 0;

            // Verify opening balance for June includes all previous interest
            expect(juneStatement.openingBalance).toBe(1000.00 + aprilInterestAmount + mayInterestAmount);

            // Verify total balance at end of June includes all interest
            const finalBalance = juneStatement.transactions.reduce((balance, t) => {
                return balance + (t.type === 'D' || t.type === 'I' ? t.amount : -t.amount);
            }, juneStatement.openingBalance);

            expect(finalBalance).toBe(1000.00 + aprilInterestAmount + mayInterestAmount + juneInterestAmount);
        });

        it('should handle interest calculation with transactions during the month', () => {
            bankAccountService.addInterestRule('20230601', 'RULE01', 2.0);

            // Initial deposit
            bankAccountService.processTransaction('20230601', 'AC001', 'D', 1000.00);
            // Additional deposit mid-month
            bankAccountService.processTransaction('20230615', 'AC001', 'D', 500.00);

            const statement = bankAccountService.getAccountStatement('AC001', 2023, 6);
            const interestTransaction = statement.transactions.find(t => t.type === 'I');

            expect(interestTransaction).toBeDefined();
            // Interest should be calculated on the average balance for the month
            expect(interestTransaction?.amount).toBeGreaterThan(0);
        });

        it('should correctly calculate opening balance with transactions across multiple months', () => {
            // Add interest rules for multiple months
            bankAccountService.addInterestRule('20230401', 'RULE01', 2.0);
            bankAccountService.addInterestRule('20230501', 'RULE02', 2.5);
            bankAccountService.addInterestRule('20230601', 'RULE03', 3.0);

            // Create transactions across multiple months
            bankAccountService.processTransaction('20230415', 'AC001', 'D', 1000.00); // April deposit
            bankAccountService.processTransaction('20230510', 'AC001', 'D', 500.00);  // May deposit
            bankAccountService.processTransaction('20230520', 'AC001', 'W', 200.00);  // May withdrawal

            // Get April statement
            const aprilStatement = bankAccountService.getAccountStatement('AC001', 2023, 4);
            const aprilInterest = aprilStatement.transactions.find(t => t.type === 'I');
            const aprilInterestAmount = aprilInterest?.amount || 0;

            // Get May statement
            const mayStatement = bankAccountService.getAccountStatement('AC001', 2023, 5);
            const mayInterest = mayStatement.transactions.find(t => t.type === 'I');
            const mayInterestAmount = mayInterest?.amount || 0;

            // Get June statement
            const juneStatement = bankAccountService.getAccountStatement('AC001', 2023, 6);

            // Calculate expected opening balance for June
            // Should include:
            // 1. Initial deposit (1000.00)
            // 2. April interest
            // 3. May deposit (500.00)
            // 4. May withdrawal (-200.00)
            // 5. May interest
            const expectedOpeningBalance = 1000.00 + aprilInterestAmount + 500.00 - 200.00 + mayInterestAmount;

            // Verify opening balance
            expect(juneStatement.openingBalance).toBe(expectedOpeningBalance);

            // Verify transactions in June statement
            expect(juneStatement.transactions.length).toBe(1);

            // Add a June transaction and verify final balance
            bankAccountService.processTransaction('20230615', 'AC001', 'D', 300.00);
            const updatedJuneStatement = bankAccountService.getAccountStatement('AC001', 2023, 6);
            const juneInterest = updatedJuneStatement.transactions.find(t => t.type === 'I');
            const juneInterestAmount = juneInterest?.amount || 0;

            // Final balance should include:
            // 1. Opening balance
            // 2. June deposit (300.00)
            // 3. June interest
            const expectedFinalBalance = expectedOpeningBalance + 300.00 + juneInterestAmount;

            const actualFinalBalance = updatedJuneStatement.transactions.reduce((balance, t) => {
                return balance + (t.type === 'D' || t.type === 'I' ? t.amount : -t.amount);
            }, updatedJuneStatement.openingBalance);

            expect(actualFinalBalance).toBe(expectedFinalBalance);
        });
    });

    describe('addInterestRule', () => {
        it('should add a new interest rule', () => {
            bankAccountService.addInterestRule('20230601', 'RULE01', 2.0);
            const rules = bankAccountService.getInterestRules();
            expect(rules.length).toBe(1);
            expect(rules[0]).toEqual({
                date: '20230601',
                ruleId: 'RULE01',
                rate: 2.0
            });
        });

        it('should replace the existing rule if the date is the same', () => {
            bankAccountService.addInterestRule('20230601', 'RULE01', 2.0);
            const rules = bankAccountService.getInterestRules();
            expect(rules.length).toBe(1);
            expect(rules[0]).toEqual({
                date: '20230601',
                ruleId: 'RULE01',
                rate: 2.0
            });
            bankAccountService.addInterestRule('20230601', 'RULE02', 3.0);
            const rules2 = bankAccountService.getInterestRules();
            expect(rules2.length).toBe(1);
            expect(rules2[0]).toEqual({
                date: '20230601',
                ruleId: 'RULE02',
                rate: 3.0
            });
        });

        it('should throw error for invalid interest rate', () => {
            expect(() => {
                bankAccountService.addInterestRule('20230601', 'RULE01', 0);
            }).toThrow('Interest rate must be between 0 and 100');

            expect(() => {
                bankAccountService.addInterestRule('20230601', 'RULE01', 100);
            }).toThrow('Interest rate must be between 0 and 100');
        });
    });

    describe('getRecentTransactions', () => {
        it('should return specified number of recent transactions', () => {
            // Create multiple transactions
            bankAccountService.processTransaction('20230601', 'AC001', 'D', 100.00);
            bankAccountService.processTransaction('20230602', 'AC001', 'D', 200.00);
            bankAccountService.processTransaction('20230603', 'AC001', 'D', 300.00);
            bankAccountService.processTransaction('20230604', 'AC001', 'D', 400.00);
            bankAccountService.processTransaction('20230605', 'AC001', 'D', 500.00);

            // Get last 3 transactions
            const statement = bankAccountService.getRecentTransactions('AC001', 3);
            expect(statement.transactions.length).toBe(3);
            expect(statement.transactions[0].amount).toBe(300.00);
            expect(statement.transactions[1].amount).toBe(400.00);
            expect(statement.transactions[2].amount).toBe(500.00);
        });

        it('should throw error for non-existent account', () => {
            expect(() => {
                bankAccountService.getRecentTransactions('NONEXISTENT');
            }).toThrow('Account not found');
        });
    });

    describe('getMonthlyStatement', () => {
        it('should not include interest for current month', () => {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const date = `${year}${month.toString().padStart(2, '0')}01`;

            bankAccountService.addInterestRule(date, 'RULE01', 2.0);
            bankAccountService.processTransaction(date, 'AC001', 'D', 1000.00);

            const statement = bankAccountService.getMonthlyStatement('AC001', year, month);
            const interestTransaction = statement.transactions.find(t => t.type === 'I');
            expect(interestTransaction).toBeUndefined();
        });

        it('should throw error for non-existent account', () => {
            expect(() => {
                bankAccountService.getMonthlyStatement('NONEXISTENT', 2023, 13);
            }).toThrow('Account not found');
        });
    });

    describe('calculateInterest', () => {
        it('should calculate interest based on end-of-day balances', () => {
            bankAccountService.addInterestRule('20230601', 'RULE01', 2.0);
            // Initial deposit
            bankAccountService.processTransaction('20230601', 'AC001', 'D', 1000.00);
            // Withdrawal on day 15
            bankAccountService.processTransaction('20230615', 'AC001', 'W', 500.00);

            const interest = bankAccountService.calculateInterest('AC001', 2023, 6, 0);
            // For a 30-day month with 2% annual rate:
            // First 14 days: 1000 * (2% / 365) * 14
            // Last 16 days: 500 * (2% / 365) * 16
            const expectedInterest = Math.round(((1000 * 0.02 / 365 * 14) + (500 * 0.02 / 365 * 16)) * 100) / 100;
            expect(interest).toBe(expectedInterest);
        });

        it('should calculate interest correctly with multiple transactions on same day', () => {
            bankAccountService.addInterestRule('20230601', 'RULE01', 2.0);
            // Initial deposit
            bankAccountService.processTransaction('20230601', 'AC001', 'D', 1000.00);
            // Multiple transactions on day 15
            bankAccountService.processTransaction('20230615', 'AC001', 'D', 500.00);
            bankAccountService.processTransaction('20230615', 'AC001', 'W', 200.00);

            const interest = bankAccountService.calculateInterest('AC001', 2023, 6, 0);
            // First 14 days: 1000 * (2% / 365) * 14
            // Last 16 days: 1300 * (2% / 365) * 16
            const expectedInterest = Math.round(((1000 * 0.02 / 365 * 14) + (1300 * 0.02 / 365 * 16)) * 100) / 100;
            expect(interest).toBe(expectedInterest);
        });

        it('should calculate interest correctly with rate changes', () => {
            // 2% rate for first half of month
            bankAccountService.addInterestRule('20230601', 'RULE01', 2.0);
            // 3% rate for second half of month
            bankAccountService.addInterestRule('20230615', 'RULE02', 3.0);

            bankAccountService.processTransaction('20230601', 'AC001', 'D', 1000.00);

            const interest = bankAccountService.calculateInterest('AC001', 2023, 6, 0);
            // First 14 days: 1000 * (2% / 365) * 14
            // Last 16 days: 1000 * (3% / 365) * 16
            const expectedInterest = Math.round(((1000 * 0.02 / 365 * 14) + (1000 * 0.03 / 365 * 16)) * 100) / 100;
            expect(interest).toBe(expectedInterest);
        });

        it('should calculate interest correctly with balance changes and rate changes', () => {
            // 2% rate for first half of month
            bankAccountService.addInterestRule('20230601', 'RULE01', 2.0);
            // 3% rate for second half of month
            bankAccountService.addInterestRule('20230615', 'RULE02', 3.0);

            bankAccountService.processTransaction('20230601', 'AC001', 'D', 1000.00);
            bankAccountService.processTransaction('20230615', 'AC001', 'D', 500.00);

            const interest = bankAccountService.calculateInterest('AC001', 2023, 6, 0);
            // First 14 days: 1000 * (2% / 365) * 14
            // Last 16 days: 1500 * (3% / 365) * 16
            const expectedInterest = Math.round(((1000 * 0.02 / 365 * 14) + (1500 * 0.03 / 365 * 16)) * 100) / 100;
            expect(interest).toBe(expectedInterest);
        });

        it('should handle zero balance correctly', () => {
            bankAccountService.addInterestRule('20230601', 'RULE01', 2.0);
            bankAccountService.processTransaction('20230601', 'AC001', 'D', 1000.00);
            bankAccountService.processTransaction('20230602', 'AC001', 'W', 1000.00);

            const interest = bankAccountService.calculateInterest('AC001', 2023, 6, 0);
            // First day: 1000 * (2% / 365) * 1
            // Remaining days: 0 * (2% / 365) * 29
            const expectedInterest = Math.round((1000 * 0.02 / 365) * 100) / 100;
            expect(interest).toBe(expectedInterest);
        });

        it('should throw error for non-existent account', () => {
            expect(() => {
                bankAccountService.calculateInterest('NONEXISTENT', 2023, 6, 0);
            }).toThrow('Account not found');
        });
    });
}); 