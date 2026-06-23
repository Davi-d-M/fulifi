-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" DATETIME,
    "siteId" TEXT NOT NULL DEFAULT 'default-site',
    CONSTRAINT "Voucher_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActiveSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "macAddress" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "voucherCode" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL DEFAULT 'PHONE',
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siteId" TEXT NOT NULL DEFAULT 'default-site',
    CONSTRAINT "ActiveSession_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoucherOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "expiryMode" TEXT NOT NULL DEFAULT 'CONTINUOUS',
    "price" REAL NOT NULL,
    "maxDevices" INTEGER NOT NULL DEFAULT 1,
    "speedLimit" TEXT,
    "downloadLimit" TEXT NOT NULL DEFAULT '5M',
    "uploadLimit" TEXT NOT NULL DEFAULT '5M',
    "dataLimitMB" INTEGER,
    "burstLimit" TEXT,
    "burstThreshold" TEXT,
    "burstTime" TEXT,
    "allowTethering" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siteId" TEXT NOT NULL DEFAULT 'default-site',
    CONSTRAINT "VoucherOffer_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionRef" TEXT,
    "idempotencyKey" TEXT,
    "amount" REAL NOT NULL,
    "phoneNumber" TEXT,
    "voucherCode" TEXT NOT NULL,
    "offerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "provisioned" BOOLEAN NOT NULL DEFAULT false,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "resultDesc" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "siteId" TEXT NOT NULL DEFAULT 'default-site',
    CONSTRAINT "Payment_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "VoucherOffer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalReference" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "amount" REAL,
    "status" TEXT NOT NULL,
    "resultDesc" TEXT,
    "macAddress" TEXT,
    "ipAddress" TEXT,
    "offerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siteId" TEXT NOT NULL DEFAULT 'default-site',
    CONSTRAINT "PaymentEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BulkVoucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherCode" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siteId" TEXT NOT NULL DEFAULT 'default-site',
    CONSTRAINT "BulkVoucher_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "VoucherOffer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BulkVoucher_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "routerHost" TEXT,
    "routerUser" TEXT,
    "routerPass" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NetworkDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "lastPing" DATETIME,
    "siteId" TEXT NOT NULL,
    "smartPlugId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NetworkDevice_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PerformanceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "downloadSpeed" REAL NOT NULL,
    "uploadSpeed" REAL NOT NULL,
    "latency" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PerformanceLog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BalanceAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "expectedRevenue" REAL NOT NULL,
    "actualRevenue" REAL NOT NULL,
    "discrepancy" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "flaggedReason" TEXT,
    "auditDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BalanceAudit_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OperationalReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sentTo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OperationalReport_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL,
    "voucherCode" TEXT,
    "message" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RouterBackup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RouterBackup_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SecurityAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityAlert_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "bannerText" TEXT NOT NULL DEFAULT '',
    "bannerType" TEXT NOT NULL DEFAULT 'info',
    "blockTethering" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SpeedTest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "download" REAL NOT NULL,
    "upload" REAL NOT NULL,
    "ping" REAL NOT NULL,
    "isp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referrerVoucher" TEXT NOT NULL,
    "referredPhone" TEXT NOT NULL,
    "rewardMinutes" INTEGER NOT NULL DEFAULT 30,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DeviceConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "macAddress" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "deviceName" TEXT,
    "voucherCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disconnectedAt" DATETIME,
    "sessionDuration" INTEGER,
    "dataUsed" REAL,
    "siteId" TEXT NOT NULL DEFAULT 'default-site',
    CONSTRAINT "DeviceConnection_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- CreateIndex
CREATE INDEX "Voucher_code_idx" ON "Voucher"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveSession_macAddress_key" ON "ActiveSession"("macAddress");

-- CreateIndex
CREATE INDEX "ActiveSession_voucherCode_idx" ON "ActiveSession"("voucherCode");

-- CreateIndex
CREATE INDEX "ActiveSession_macAddress_idx" ON "ActiveSession"("macAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionRef_key" ON "Payment"("transactionRef");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_voucherCode_idx" ON "Payment"("voucherCode");

-- CreateIndex
CREATE INDEX "Payment_transactionRef_idx" ON "Payment"("transactionRef");

-- CreateIndex
CREATE INDEX "Payment_idempotencyKey_idx" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_provisioned_status_idx" ON "Payment"("provisioned", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_externalReference_key" ON "PaymentEvent"("externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "BulkVoucher_voucherCode_key" ON "BulkVoucher"("voucherCode");

-- CreateIndex
CREATE INDEX "DeviceConnection_macAddress_idx" ON "DeviceConnection"("macAddress");

-- CreateIndex
CREATE INDEX "DeviceConnection_ipAddress_idx" ON "DeviceConnection"("ipAddress");

-- CreateIndex
CREATE INDEX "DeviceConnection_voucherCode_idx" ON "DeviceConnection"("voucherCode");

-- CreateIndex
CREATE INDEX "DeviceConnection_connectedAt_idx" ON "DeviceConnection"("connectedAt");
