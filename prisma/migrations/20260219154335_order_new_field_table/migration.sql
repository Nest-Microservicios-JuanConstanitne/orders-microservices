/*
  Warnings:

  - You are about to drop the column `total` on the `Order` table. All the data in the column will be lost.
  - Added the required column `totalAmount` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalItems` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'DELIVERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "total",
ADD COLUMN     "paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalItems" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL;
