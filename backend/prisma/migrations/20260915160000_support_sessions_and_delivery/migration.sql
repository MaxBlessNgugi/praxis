-- A support session is a period of access a Praxis operator opens inside a church, and the church's
-- own audit log is where it has to appear. `view` is the honest verb for it: being looked at is not a
-- change to anybody's records, and calling it an `update` would put a row in the trail that says the
-- church was modified when it was not.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'view';

-- What the provider said about a broadcast, kept beside it rather than in a log somebody has to hunt
-- through: how many went out, how many did not, and the first few reasons why. JSON rather than a
-- table of its own because it is a report about one send, read by the screen that sent it.
ALTER TABLE "Broadcast" ADD COLUMN "lastReport" JSONB;
