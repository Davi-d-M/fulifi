-- CreateTable
CREATE TABLE "BlacklistedDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "macAddress" TEXT NOT NULL,
    "ipAddress" TEXT,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "bannedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bannedUntil" DATETIME,
    "bannedBy" TEXT NOT NULL,
    "notes" TEXT,
    "siteId" TEXT NOT NULL DEFAULT 'default-site',
    CONSTRAINT "BlacklistedDevice_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WhitelistedDevice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "macAddress" TEXT NOT NULL,
    "ipAddress" TEXT,
    "name" TEXT NOT NULL,
    "reason" TEXT,
    "freeAccess" BOOLEAN NOT NULL DEFAULT true,
    "allowedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "siteId" TEXT NOT NULL DEFAULT 'default-site',
    CONSTRAINT "WhitelistedDevice_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeviceProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "macAddress" TEXT NOT NULL,
    "ipAddress" TEXT,
    "deviceType" TEXT,
    "deviceName" TEXT,
    "browserType" TEXT,
    "osVersion" TEXT,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalDataUsed" REAL NOT NULL DEFAULT 0,
    "totalSpent" REAL NOT NULL DEFAULT 0,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL,
    "siteId" TEXT NOT NULL DEFAULT 'default-site',
    CONSTRAINT "DeviceProfile_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdminAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "siteId" TEXT NOT NULL DEFAULT 'default-site',
    CONSTRAINT "AdminAlert_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RevenueSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "totalRevenue" REAL NOT NULL,
    "totalSessions" INTEGER NOT NULL,
    "activeUsers" INTEGER NOT NULL,
    "totalUsers" INTEGER NOT NULL,
    "averageSessionDuration" INTEGER NOT NULL,
    "topPackage" TEXT,
    "topDeviceType" TEXT,
    "siteId" TEXT NOT NULL DEFAULT 'default-site',
    CONSTRAINT "RevenueSnapshot_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BlacklistedDevice_macAddress_idx" ON "BlacklistedDevice"("macAddress");

-- CreateIndex
CREATE INDEX "BlacklistedDevice_bannedAt_idx" ON "BlacklistedDevice"("bannedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhitelistedDevice_macAddress_key" ON "WhitelistedDevice"("macAddress");

-- CreateIndex
CREATE INDEX "WhitelistedDevice_macAddress_idx" ON "WhitelistedDevice"("macAddress");

-- CreateIndex
CREATE INDEX "DeviceProfile_macAddress_idx" ON "DeviceProfile"("macAddress");

-- CreateIndex
CREATE INDEX "DeviceProfile_deviceType_idx" ON "DeviceProfile"("deviceType");

-- CreateIndex
CREATE INDEX "DeviceProfile_lastSeen_idx" ON "DeviceProfile"("lastSeen");

-- CreateIndex
CREATE INDEX "AdminAlert_read_createdAt_idx" ON "AdminAlert"("read", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAlert_severity_idx" ON "AdminAlert"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueSnapshot_date_key" ON "RevenueSnapshot"("date");

-- CreateIndex
CREATE INDEX "RevenueSnapshot_date_idx" ON "RevenueSnapshot"("date");
