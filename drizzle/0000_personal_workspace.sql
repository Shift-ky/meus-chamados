CREATE TABLE tickets (id text PRIMARY KEY NOT NULL, number text NOT NULL, closed_on text NOT NULL, created_at text NOT NULL);
--> statement-breakpoint
CREATE UNIQUE INDEX tickets_number_unique ON tickets(lower(trim(number)));
--> statement-breakpoint
CREATE TABLE notepad (id integer PRIMARY KEY NOT NULL CHECK(id=1), content text NOT NULL DEFAULT '');
