ALTER TABLE "orders" ADD COLUMN "tracking_number" text;
--> statement-breakpoint
CREATE TABLE "order_status_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_status_emails_order_id_event_type_unique" UNIQUE("order_id","event_type")
);
--> statement-breakpoint
ALTER TABLE "order_status_emails" ADD CONSTRAINT "order_status_emails_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
