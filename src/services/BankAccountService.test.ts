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
    });

    describe('getAccountStatement', () => {
        it('should generate correct account statement with interest', () => {
            bankAccountService.processTransaction('20230601', 'AC001', 'D', 1000.00);
            bankAccountService.processTransaction('20230615', 'AC001', 'W', 500.00);
            
            const statement = bankAccountService.getAccountStatement('AC001', 2023, 6);
            
            expect(statement.accountId).toBe('AC001');
            expect(statement.transactions.length).toBe(2);
            expect(statement.balance).toBe(500.00);
        });
    });
}); 