-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "chargeableMins" INTEGER,
ADD COLUMN     "totalMins" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'OPEN';
