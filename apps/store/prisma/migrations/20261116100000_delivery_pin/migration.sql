ALTER TABLE "Order"
  ADD COLUMN "deliveryLatitude" DOUBLE PRECISION,
  ADD COLUMN "deliveryLongitude" DOUBLE PRECISION,
  ADD CONSTRAINT "Order_delivery_pin_pair" CHECK (
    ("deliveryLatitude" IS NULL AND "deliveryLongitude" IS NULL)
    OR (
      "deliveryLatitude" IS NOT NULL AND "deliveryLongitude" IS NOT NULL
      AND "deliveryLatitude" BETWEEN -90 AND 90
      AND "deliveryLongitude" BETWEEN -180 AND 180
    )
  );
