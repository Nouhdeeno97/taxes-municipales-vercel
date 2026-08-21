ALTER TABLE `tax_rule_scopes` ADD `activityLabelQuery` varchar(220);--> statement-breakpoint
ALTER TABLE `tax_rule_scopes` ADD `taxpayerNationalId` varchar(128);--> statement-breakpoint
ALTER TABLE `tax_rule_scopes` ADD `taxpayerFiscalId` varchar(128);--> statement-breakpoint
CREATE INDEX `tax_rule_scope_group_idx` ON `tax_rule_scopes` (`taxRuleId`,`activityTypeId`,`zoneId`,`marketId`);