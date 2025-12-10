import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1733844000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );

    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "googleId" character varying NOT NULL, "email" character varying NOT NULL, "name" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_user_googleId" UNIQUE ("googleId"), CONSTRAINT "UQ_user_email" UNIQUE ("email"), CONSTRAINT "PK_user" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "wallet" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "balance" numeric(10,2) NOT NULL DEFAULT '0', "walletNumber" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid NOT NULL, CONSTRAINT "UQ_wallet_walletNumber" UNIQUE ("walletNumber"), CONSTRAINT "REL_wallet_userId" UNIQUE ("userId"), CONSTRAINT "PK_wallet" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "transaction" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying NOT NULL, "amount" numeric(10,2) NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "reference" character varying, "recipientWalletNumber" character varying, "description" character varying, "senderWalletNumber" character varying, "paystackEventId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid NOT NULL, CONSTRAINT "UQ_transaction_reference" UNIQUE ("reference"), CONSTRAINT "PK_transaction" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TABLE "api_key" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "keyPrefix" character varying(8) NOT NULL, "hashedKey" character varying NOT NULL, "name" character varying NOT NULL, "permissions" text NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid NOT NULL, CONSTRAINT "PK_api_key" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "wallet" ADD CONSTRAINT "FK_wallet_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" ADD CONSTRAINT "FK_transaction_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_key" ADD CONSTRAINT "FK_api_key_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_key" DROP CONSTRAINT "FK_api_key_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "transaction" DROP CONSTRAINT "FK_transaction_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wallet" DROP CONSTRAINT "FK_wallet_userId"`,
    );
    await queryRunner.query(`DROP TABLE "api_key"`);
    await queryRunner.query(`DROP TABLE "transaction"`);
    await queryRunner.query(`DROP TABLE "wallet"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}