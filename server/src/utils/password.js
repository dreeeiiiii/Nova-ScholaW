import bcrypt from 'bcrypt';

export const SALT_ROUNDS = 10;

export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

export const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);