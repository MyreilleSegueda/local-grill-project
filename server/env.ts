// server/env.ts
export const env = {
  jwt: {
    secret: process.env.JWT_SECRET || 'ehbGciOiJFG4~NiIsInR5cCI*6IkpXVCJ9.e%yJ1c2VySWQiOjEsImlhdCI6MTc1NT#?AwMjE2M@wIjoxNzU10e0f0MDA1NzYxfQ.svM8JJ9vzt4Lxz4oOuZi',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
};