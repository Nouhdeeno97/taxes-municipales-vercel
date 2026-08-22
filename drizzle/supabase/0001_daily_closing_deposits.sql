CREATE TABLE "daily_closing_deposits" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"dailyClosingId" varchar(36) NOT NULL,
	"depositId" varchar(36) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_closing_deposits" ADD CONSTRAINT "daily_closing_deposits_dailyClosingId_daily_closings_id_fk" FOREIGN KEY ("dailyClosingId") REFERENCES "public"."daily_closings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closing_deposits" ADD CONSTRAINT "daily_closing_deposits_depositId_deposits_id_fk" FOREIGN KEY ("depositId") REFERENCES "public"."deposits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_closing_deposit_unique" ON "daily_closing_deposits" USING btree ("dailyClosingId","depositId");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_closing_deposit_global_unique" ON "daily_closing_deposits" USING btree ("depositId");--> statement-breakpoint
CREATE INDEX "daily_closing_deposit_closing_idx" ON "daily_closing_deposits" USING btree ("dailyClosingId");