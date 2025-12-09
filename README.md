# Paystack Wallet Service

A robust backend service for a simple wallet system built with NestJS, integrated with Paystack for handling deposits. This service provides a secure and scalable foundation for applications requiring wallet functionalities.

## Features

- **User & Authentication**: Secure user authentication via Google OAuth.
- **API Key Management**: Generate and manage API keys for programmatic access with specific permissions (deposit, transfer, read).
- **Wallet Management**: Automatic wallet creation for new users with a unique, collision-resistant wallet number.
- **Paystack Integration**: Seamlessly handle deposits via Paystack, with secure webhook processing using signature validation.
- **Fund Transfers**: Perform atomic wallet-to-wallet transfers between users, ensuring data integrity.
- **Financial Integrity**: Uses `Decimal.js` for all monetary calculations to avoid floating-point inaccuracies.
- **Transaction History**: Keeps a record of all wallet activities (deposits, transfers).
- **Security**:
  - Protection against webhook replay attacks.
  - Rate limiting on sensitive endpoints.
  - JWT-based authentication for users and API keys.
  - Environment-based secrets management.
- **Scheduled Tasks**:
  - Automatically revokes expired API keys.
  - Automatically times out and fails pending transactions that are not completed within 24 hours.

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/)
- **ORM**: [TypeORM](https://typeorm.io/)
- **Authentication**: [Passport.js](https://www.passportjs.org/) (JWT & Google Strategy)
- **Payments**: [Paystack](https://paystack.com/)
- **API Documentation**: [Swagger](https://swagger.io/)

## Prerequisites

- [Node.js](https://nodejs.org/en/) (v18 or newer recommended)
- [NPM](https://www.npmjs.com/)
- [PostgreSQL](https://www.postgresql.org/download/) running instance
- A [Paystack](https://paystack.com/) account (for secret key)
- A [Google Cloud Platform](https://console.cloud.google.com/) project with OAuth 2.0 credentials

## Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd paystack_wallet_service
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory by copying the example:
    ```bash
    cp .env.example .env
    ```
    Fill in the required values in the `.env` file:

    ```env
    # Database
    DB_HOST=localhost
    DB_PORT=5432
    DB_USERNAME=your_db_user
    DB_PASSWORD=your_db_password
    DB_DATABASE=your_db_name

    # Paystack
    PAYSTACK_SECRET_KEY=sk_xxxxxxxxxxxx

    # Google OAuth
    GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=xxxxxxxxxxxx

    # JWT
    JWT_SECRET=your_strong_jwt_secret
    ```

4.  **Run Database Migrations:**
    *(Assuming you have a migration script in `package.json`. If not, TypeORM will sync entities if configured).*
    ```bash
    # Example command - you may need to add this to your package.json
    # "typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js",
    # "migration:run": "npm run typeorm -- -d ./src/data-source.ts migration:run"
    
    # If no migrations are set up, TypeORM's synchronize feature might be enabled for development.
    ```

## Running the Application

-   **Development mode (with hot-reload):**
    ```bash
    npm run start:dev
    ```

-   **Production mode:**
    ```bash
    npm run build
    npm run start:prod
    ```

The application will be running on `http://localhost:3001`. The Swagger API documentation will be available at `http://localhost:3000/api`.

## API Endpoints

The following is a brief overview of the main API endpoints. For detailed information, please refer to the Swagger documentation.

-   `GET /auth/google` - Initiate Google OAuth2 login.
-   `GET /auth/google/callback` - Callback URL for Google OAuth2.
-   `POST /api-key/generate` - Generate a new API key with specified permissions.
-   `POST /wallet/deposit` - Initialize a deposit transaction.
-   `GET /wallet/balance` - Get the current wallet balance.
-   `POST /wallet/transfer` - Transfer funds to another wallet.
-   `GET /wallet/transactions` - Get user's transaction history.
-   `POST /wallet/paystack/webhook` - Webhook endpoint for Paystack events.

## Running Tests

-   **Run unit tests:**
    ```bash
    npm run test
    ```

-   **Run end-to-end (e2e) tests:**
    ```bash
    npm run test:e2e
    ```