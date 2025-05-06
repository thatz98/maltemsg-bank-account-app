# Bank Account Application

A simple banking system built with TypeScript that handles operations on bank accounts. The system provides a command-line interface for managing bank accounts, processing transactions, and generating statements.

## Features

1. **Transaction Management**
   - Create new accounts automatically with first deposit
   - Process deposits and withdrawals
   - Prevent invalid operations (withdrawals from empty accounts)
   - Generate unique transaction IDs

2. **Interest Rules**
   - Define interest rates with effective dates
   - Support multiple interest rate changes
   - Calculate interest based on daily balances

3. **Account Statements**
   - View monthly account statements
   - Display all transactions with running balance
   - Include calculated interest

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Docker (optional, for containerized deployment)

## Installation

### Using Docker (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/thatz98/maltemsg-bank-account-app.git
   cd maltemsg-bank-account-app
   ```

2. Build the Docker image:
   ```bash
   docker build -t bank-account-app .
   ```

3. Run the container:
   ```bash
   docker run -it bank-account-app
   ```

### Manual Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/thatz98/maltemsg-bank-account-app.git
   cd maltemsg-bank-account-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage

Start the application:
```bash
npm start
```

The application will present a menu with the following options:
- [T] Input transactions
- [I] Define interest rules
- [P] Print statement
- [Q] Quit

### Input Transactions
Enter transaction details in the format:
```
<Date> <Account> <Type> <Amount>
```
Example: `20230626 AC001 D 100.00`

- Date: YYYYMMDD format
- Account: Any string identifier
- Type: D for deposit, W for withdrawal
- Amount: Positive number with up to 2 decimal places

### Define Interest Rules
Enter interest rule details in the format:
```
<Date> <RuleId> <Rate in %>
```
Example: `20230615 RULE03 2.20`

- Date: YYYYMMDD format
- RuleId: Any string identifier
- Rate: Percentage between 0 and 100

### Print Statement
Enter account and month in the format:
```
<Account> <YearMonth>
```
Example: `AC001 202306`

## Development

### Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. The project uses ESLint v9 with the new flat config format. The configuration is in `eslint.config.mjs` and uses ES module format.

### Running Tests
```bash
npm test
```

Watch mode for development:
```bash
npm run test:watch
```

### Code Quality

Run linting:
```bash
npm run lint
```

### Project Structure

```
src/
├── cli/           # CLI interface and user interaction
├── models/        # Type definitions and interfaces
├── services/      # Core business logic and operations
└── index.ts       # Application entry point
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

This project follows the TypeScript style guide and uses ESLint for code quality. Please ensure your code passes the linting checks before submitting a pull request.

## Testing

The project uses Jest for testing. Write tests for new features and ensure all tests pass before submitting changes.

## Acknowledgments

- Built with TypeScript
- Uses Jest for testing
- ESLint for code quality