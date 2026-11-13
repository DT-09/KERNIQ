CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "shop" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "scope" TEXT,
  "expires" TIMESTAMP(3),
  "accessToken" TEXT NOT NULL,
  "userId" BIGINT,
  "firstName" TEXT,
  "lastName" TEXT,
  "email" TEXT,
  "accountOwner" BOOLEAN NOT NULL DEFAULT false,
  "locale" TEXT,
  "collaborator" BOOLEAN DEFAULT false,
  "emailVerified" BOOLEAN DEFAULT false,
  "refreshToken" TEXT,
  "refreshTokenExpires" TIMESTAMP(3),
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Store" (
  "shopDomain" TEXT NOT NULL,
  "currencyCode" TEXT,
  "timezone" TEXT,
  "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastCatalogSync" TIMESTAMP(3),
  "lastOrderSync" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Store_pkey" PRIMARY KEY ("shopDomain")
);

CREATE TABLE "StoreSettings" (
  "shopDomain" TEXT NOT NULL,
  "defaultCurrency" TEXT,
  "defaultCogsMode" TEXT NOT NULL DEFAULT 'unknown',
  "attributionDays" INTEGER NOT NULL DEFAULT 7,
  "paymentFeeBps" INTEGER,
  "fulfillmentCostMinor" INTEGER,
  "shippingSubsidyMinor" INTEGER,
  "minimumContributionMinor" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("shopDomain")
);

CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "shopDomain" TEXT NOT NULL,
  "shopifyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "handle" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "productType" TEXT,
  "vendor" TEXT,
  "tags" TEXT[] NOT NULL,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Variant" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "shopifyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sku" TEXT,
  "priceMinor" INTEGER NOT NULL,
  "compareAtMinor" INTEGER,
  "inventoryQty" INTEGER,
  "unitCostMinor" INTEGER,
  "costSource" TEXT NOT NULL DEFAULT 'unknown',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "shopDomain" TEXT NOT NULL,
  "shopifyId" TEXT NOT NULL,
  "orderNumber" TEXT,
  "currencyCode" TEXT NOT NULL,
  "financialStatus" TEXT,
  "fulfillmentStatus" TEXT,
  "createdAtShopify" TIMESTAMP(3) NOT NULL,
  "processedAt" TIMESTAMP(3),
  "subtotalMinor" INTEGER NOT NULL,
  "discountMinor" INTEGER NOT NULL,
  "refundMinor" INTEGER NOT NULL,
  "totalMinor" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderLineItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "shopifyLineId" TEXT NOT NULL,
  "variantShopifyId" TEXT,
  "productShopifyId" TEXT,
  "title" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceMinor" INTEGER NOT NULL,
  "discountMinor" INTEGER NOT NULL,
  "refundMinor" INTEGER NOT NULL,
  CONSTRAINT "OrderLineItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Offer" (
  "id" TEXT NOT NULL,
  "shopDomain" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "placement" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "minimumMarginBps" INTEGER,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfferEvent" (
  "id" TEXT NOT NULL,
  "shopDomain" TEXT NOT NULL,
  "offerId" TEXT,
  "eventKey" TEXT NOT NULL,
  "visitorKey" TEXT,
  "sessionKey" TEXT,
  "orderShopifyId" TEXT,
  "productShopifyId" TEXT,
  "revenueMinor" INTEGER,
  "discountMinor" INTEGER,
  "contributionMinor" INTEGER,
  "payload" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfferEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Experiment" (
  "id" TEXT NOT NULL,
  "shopDomain" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "hypothesis" TEXT NOT NULL,
  "allocation" JSONB NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SyncRun" (
  "id" TEXT NOT NULL,
  "shopDomain" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "cursor" TEXT,
  "recordsRead" INTEGER NOT NULL DEFAULT 0,
  "errorCode" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_shopDomain_shopifyId_key" ON "Product"("shopDomain", "shopifyId");
CREATE INDEX "Product_shopDomain_status_idx" ON "Product"("shopDomain", "status");
CREATE UNIQUE INDEX "Variant_productId_shopifyId_key" ON "Variant"("productId", "shopifyId");
CREATE UNIQUE INDEX "Order_shopDomain_shopifyId_key" ON "Order"("shopDomain", "shopifyId");
CREATE INDEX "Order_shopDomain_createdAtShopify_idx" ON "Order"("shopDomain", "createdAtShopify");
CREATE UNIQUE INDEX "OrderLineItem_orderId_shopifyLineId_key" ON "OrderLineItem"("orderId", "shopifyLineId");
CREATE INDEX "Offer_shopDomain_status_idx" ON "Offer"("shopDomain", "status");
CREATE UNIQUE INDEX "OfferEvent_shopDomain_eventKey_key" ON "OfferEvent"("shopDomain", "eventKey");
CREATE INDEX "OfferEvent_shopDomain_occurredAt_idx" ON "OfferEvent"("shopDomain", "occurredAt");
CREATE INDEX "Experiment_shopDomain_status_idx" ON "Experiment"("shopDomain", "status");
CREATE INDEX "SyncRun_shopDomain_startedAt_idx" ON "SyncRun"("shopDomain", "startedAt");

ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_shopDomain_fkey"
  FOREIGN KEY ("shopDomain") REFERENCES "Store"("shopDomain") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_shopDomain_fkey"
  FOREIGN KEY ("shopDomain") REFERENCES "Store"("shopDomain") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_shopDomain_fkey"
  FOREIGN KEY ("shopDomain") REFERENCES "Store"("shopDomain") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_shopDomain_fkey"
  FOREIGN KEY ("shopDomain") REFERENCES "Store"("shopDomain") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferEvent" ADD CONSTRAINT "OfferEvent_shopDomain_fkey"
  FOREIGN KEY ("shopDomain") REFERENCES "Store"("shopDomain") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OfferEvent" ADD CONSTRAINT "OfferEvent_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_shopDomain_fkey"
  FOREIGN KEY ("shopDomain") REFERENCES "Store"("shopDomain") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_shopDomain_fkey"
  FOREIGN KEY ("shopDomain") REFERENCES "Store"("shopDomain") ON DELETE CASCADE ON UPDATE CASCADE;
