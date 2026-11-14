-- Run only against a disposable database after applying both migrations.
BEGIN;
INSERT INTO "User" (id,name,email,"updatedAt") VALUES ('couple-qa-a','A','couple-qa-a@example.invalid',NOW()),('couple-qa-b','B','couple-qa-b@example.invalid',NOW());
INSERT INTO "Couple" (id) VALUES ('couple-qa-first'),('couple-qa-next');
INSERT INTO "CoupleMember" ("userId","coupleId") VALUES ('couple-qa-a','couple-qa-first'),('couple-qa-b','couple-qa-first');
DO $$ BEGIN BEGIN INSERT INTO "CoupleMember" ("userId","coupleId") VALUES ('couple-qa-a','couple-qa-next'); RAISE EXCEPTION 'One account joined two couples'; EXCEPTION WHEN unique_violation THEN NULL; END; END $$;
INSERT INTO "DiaryEntry" (id,"userId",title,content,date,"updatedAt") VALUES ('couple-qa-private','couple-qa-a','Private','Not shared','2026-11-14',NOW());
INSERT INTO "DiaryEntry" (id,"userId",title,content,date,"updatedAt","sharedCoupleId") VALUES ('couple-qa-shared','couple-qa-a','Shared','Explicitly shared','2026-11-14',NOW(),'couple-qa-first');
INSERT INTO "Mood" (id,"userId",date,mood,"updatedAt","sharedCoupleId") VALUES ('couple-qa-mood','couple-qa-a','2026-11-14','calm',NOW(),'couple-qa-first');
DO $$ BEGIN IF (SELECT COUNT(*) FROM "DiaryEntry" WHERE "sharedCoupleId"='couple-qa-first' AND "userId"='couple-qa-a') <> 1 THEN RAISE EXCEPTION 'Private diary exposed or shared diary missing'; END IF; IF EXISTS (SELECT FROM "DiaryEntry" WHERE "sharedCoupleId"='couple-qa-next') THEN RAISE EXCEPTION 'Unrelated couple can read a diary'; END IF; END $$;
UPDATE "DiaryEntry" SET title='Unauthorized' WHERE id='couple-qa-shared' AND "userId"='couple-qa-b';
DO $$ BEGIN IF EXISTS (SELECT FROM "DiaryEntry" WHERE title='Unauthorized') THEN RAISE EXCEPTION 'Another account edited a diary'; END IF; END $$;
DELETE FROM "Couple" WHERE id='couple-qa-first';
DO $$ BEGIN IF EXISTS (SELECT FROM "CoupleMember" WHERE "coupleId"='couple-qa-first') THEN RAISE EXCEPTION 'Disconnect kept members'; END IF; IF EXISTS (SELECT FROM "DiaryEntry" WHERE "userId"='couple-qa-a' AND "sharedCoupleId" IS NOT NULL) THEN RAISE EXCEPTION 'Disconnect kept diary sharing'; END IF; IF EXISTS (SELECT FROM "Mood" WHERE id='couple-qa-mood' AND "sharedCoupleId" IS NOT NULL) THEN RAISE EXCEPTION 'Disconnect kept mood sharing'; END IF; IF (SELECT COUNT(*) FROM "DiaryEntry" WHERE "userId"='couple-qa-a') <> 2 THEN RAISE EXCEPTION 'Disconnect deleted personal diaries'; END IF; END $$;
INSERT INTO "CoupleMember" ("userId","coupleId") VALUES ('couple-qa-a','couple-qa-next'),('couple-qa-b','couple-qa-next');
DO $$ BEGIN IF EXISTS (SELECT FROM "DiaryEntry" WHERE "sharedCoupleId"='couple-qa-next') THEN RAISE EXCEPTION 'Reconnecting restored old shares'; END IF; END $$;
SELECT 'MOODORA_COUPLE_DB_CHECK_PASSED';
ROLLBACK;
