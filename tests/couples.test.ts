import test from 'node:test';
import assert from 'node:assert/strict';
import { hashInvite, inviteCodeSchema, lockOrder, newInvite, partnerActionSchema } from '../src/lib/couple-invites.ts';
test('invitation codes are random, URL-safe, and stored only as a one-way hash', () => {
 const one=newInvite(),two=newInvite();assert.notEqual(one.code,two.code);assert.equal(inviteCodeSchema.parse(one.code),one.code);assert.equal(one.tokenHash,hashInvite(one.code));assert.notEqual(one.tokenHash,one.code);assert.equal(one.tokenHash.length,64);
});
test('invitations expire exactly 24 hours after creation', () => {
 const now=new Date('2026-11-14T10:00:00Z');assert.equal(newInvite(now).expiresAt.toISOString(),'2026-11-15T10:00:00.000Z');
});
test('partial codes, punctuation, and oversized codes cannot be accepted',()=>{
 for(const code of ['', 'short', 'A'.repeat(31), 'A'.repeat(33), '?'.repeat(32)])assert.equal(inviteCodeSchema.safeParse(code).success,false);
});
test('sharing requires an explicit boolean and cannot take an owner or couple ID from the client',()=>{
 const valid={action:'share',kind:'diary',id:'entry',shared:true};assert.deepEqual(partnerActionSchema.parse({...valid,userId:'other',sharedCoupleId:'other'}),valid);assert.equal(partnerActionSchema.safeParse({...valid,shared:'true'}).success,false);assert.equal(partnerActionSchema.safeParse({...valid,kind:'account'}).success,false);
});
test('both sides of a relationship acquire user locks in the same unique order',()=>{
 assert.deepEqual(lockOrder(['b','a','b']),['a','b']);assert.deepEqual(lockOrder(['a','b']),lockOrder(['b','a']));
});
