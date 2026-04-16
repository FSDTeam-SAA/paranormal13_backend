import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
dotenv.config();

const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjUzMDcyNGQ0OTE3M2EzZWQ2YjRhMDBhYTYzNDQyMDMwMGQ3MmFlNWIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI1MjQ5MTIxNDAxMTgtY3IybmdlNm44bWw3MWVuaXVzNmVmb2Fvbm5qYW9hbWYuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI1MjQ5MTIxNDAxMTgtbm1qOWo3YWg4MWFma2QydG9rZWM3bHVkcGllbGhqNXAuYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTQ4MjA1ODYyNjAzNzMzMDgwOTAiLCJlbWFpbCI6Im5veW9uYmRjNzg3QGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiTm95b24iLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jSmtrM1FZTTZwQng2eVcyU29lb29FMVd4MzFtQWJNN3oxZnEyeFpfYW5id0JFOVFRPXM5Ni1jIiwiZ2l2ZW5fbmFtZSI6Ik5veW9uIiwiaWF0IjoxNzczNDc0OTU5LCJleHAiOjE3NzM0Nzg1NTl9.a6P4H6C49t7WNRm7MGhKTUXx9vdChSkZ1lNAwwZyQgck5kXLCQ_4CeqUZkcts1P4Olk3KSc770tTVpOlvj0c0HxdrywasbqYElsC2kXeAywMEI5Lge0pwa71i1inAKZZlkOfRI2zYnfX0NRAzcF68v0YiYubflLOrDQYo1ZHKmEwKYxpUB-zJwRvJZDFsLeobR89EjwQXUPKGcrHsKDGr_Jc6rc9dMldkTpt0AziDkSPUETSOIuWNOUhwmhO74Xym7wPuGCK6cPdq3";

const GOOGLE_AUDIENCES = [
    "524912140118-nmj9j7ah81afkd2tokec7ludpielhj5p.apps.googleusercontent.com", // WEB
    "524912140118-cr2nge6n8ml71enius6efoaonnjaoamf.apps.googleusercontent.com", // ANDROID
];

async function debug() {
    console.log(`Testing with audiences: ${GOOGLE_AUDIENCES}`);
    const client = new OAuth2Client();
    try {
        const ticket = await client.verifyIdToken({
            idToken: token.trim(),
            audience: GOOGLE_AUDIENCES,
        });
        console.log("SUCCESS!");
        console.log(ticket.getPayload());
    } catch (err) {
        console.log(`FAILED: ${err.message}`);
        // Log more details if available
        if (err.stack) console.log(err.stack);
    }
}

debug();
