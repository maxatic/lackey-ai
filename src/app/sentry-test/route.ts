// ponytail: temporary verification endpoint — delete after confirming Sentry receives the event
export function GET() {
  throw new Error('Sentry test error — Task 7 verification');
}
