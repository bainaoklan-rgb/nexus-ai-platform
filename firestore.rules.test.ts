/**
 * Firestore Security Rules Test Suite — Dirty Dozen Verification
 */
export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  { id: 1, name: 'Shadow Field Injection on User Create', collection: 'users', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 2, name: 'Self-Assigned Admin Role on User Create', collection: 'users', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 3, name: 'Client-Side Plan Upgrade on User Update', collection: 'users', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 4, name: 'Unverified Email Admin Spoof', collection: 'admins', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 5, name: 'Cross-User PII Read', collection: 'user_profiles', operation: 'get', expectedResult: 'PERMISSION_DENIED' },
  { id: 6, name: 'Unbounded List Scraping on Saved Projects', collection: 'saved_projects', operation: 'list', expectedResult: 'PERMISSION_DENIED' },
  { id: 7, name: 'Orphaned Project Creation', collection: 'saved_projects', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 8, name: 'ID Poisoning Attack', collection: 'saved_projects', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 9, name: 'Denial-of-Wallet String Exhaustion', collection: 'saved_projects', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 10, name: 'Client-Side Order Approval', collection: 'orders', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 11, name: 'Terminal State Mutation on Closed Ticket', collection: 'support_tickets', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 12, name: 'Forged Timestamp Backdating', collection: 'usage_history', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
];
